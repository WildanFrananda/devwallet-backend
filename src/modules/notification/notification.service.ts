import { Inject, Injectable, Logger, OnModuleInit, Optional } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import * as admin from "firebase-admin"
import * as fs from "fs"
import { InjectRepository } from "@nestjs/typeorm"
import { In, Repository } from "typeorm"
import DeviceEntity from "../../domain/entities/device.entity"

type FaucetNotificationPayload = {
  title: string
  body: string
  data: Record<string, string>
}

/**
 * Firebase Cloud Messaging fan-out. Loads the admin SDK once at module
 * init; if `FIREBASE_ADMIN_KEY_PATH` is not configured (dev), the service
 * still constructs but logs warnings on send instead of crashing.
 *
 * Tokens are looked up via the `devices` table by fingerprint. iOS push is
 * deferred per kickoff §4 — backend send is platform-agnostic, but iOS
 * tokens won't actually receive until Apple Dev account active.
 */
@Injectable()
class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name)
  private messaging: admin.messaging.Messaging | null = null

  public constructor(
    @Inject(ConfigService) private readonly config: ConfigService,
    @Optional()
    @InjectRepository(DeviceEntity)
    private readonly devices: Repository<DeviceEntity> | undefined
  ) {}

  public onModuleInit(): void {
    const projectId = this.config.get<string>("FIREBASE_PROJECT_ID")
    const keyPath = this.config.get<string>("FIREBASE_ADMIN_KEY_PATH")
    if (!projectId || !keyPath) {
      this.logger.warn("FIREBASE_PROJECT_ID / FIREBASE_ADMIN_KEY_PATH not configured — push notifications disabled")
      return
    }
    if (!fs.existsSync(keyPath)) {
      this.logger.warn(`Firebase admin key not found at ${keyPath} — push notifications disabled`)
      return
    }
    try {
      const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8")) as admin.ServiceAccount
      if (admin.apps.length === 0) {
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId })
      }
      this.messaging = admin.messaging()
      this.logger.log(`Firebase admin initialized projectId=${projectId}`)
    } catch (err) {
      this.logger.error(`Firebase admin init failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  public async sendByFingerprint(fingerprint: string, payload: FaucetNotificationPayload): Promise<void> {
    const tokens = await this.tokensForFingerprint(fingerprint)
    if (tokens.length === 0) {
      this.logger.debug(`No FCM tokens for fingerprint=${fingerprint}`)
      return
    }
    await this.sendToTokens(tokens, payload)
  }

  public async sendToTokens(tokens: ReadonlyArray<string>, payload: FaucetNotificationPayload): Promise<void> {
    if (!this.messaging) {
      this.logger.warn(`Push not configured — would have sent "${payload.title}" to ${tokens.length} tokens`)
      return
    }
    if (tokens.length === 0) return
    const response = await this.messaging.sendEachForMulticast({
      tokens: [...tokens],
      notification: { title: payload.title, body: payload.body },
      data: payload.data,
      android: { priority: "high" },
      apns: { headers: { "apns-priority": "10" } }
    })
    this.logger.log(`FCM sent ${response.successCount}/${tokens.length} (failures=${response.failureCount})`)
    if (response.failureCount > 0) {
      const dead: string[] = []
      response.responses.forEach((r, idx) => {
        if (!r.success && NotificationService.isDeadTokenError(r.error)) {
          const tok = tokens[idx]
          if (tok) dead.push(tok)
        }
      })
      if (dead.length > 0) await this.pruneDeadTokens(dead)
    }
  }

  private async tokensForFingerprint(fingerprint: string): Promise<string[]> {
    if (!this.devices) return []
    const rows = await this.devices.find({ where: { fingerprint } })
    return rows.map(r => r.push_token).filter((t): t is string => typeof t === "string" && t.length > 0)
  }

  private async pruneDeadTokens(tokens: ReadonlyArray<string>): Promise<void> {
    if (!this.devices || tokens.length === 0) return
    await this.devices.update({ push_token: In([...tokens]) }, { push_token: null })
    this.logger.log(`Pruned ${tokens.length} dead FCM tokens`)
  }

  private static isDeadTokenError(err: unknown): boolean {
    const fbErr = err as { code?: string } | undefined
    return (
      fbErr?.code === "messaging/registration-token-not-registered" ||
      fbErr?.code === "messaging/invalid-registration-token"
    )
  }
}

export default NotificationService
export type { FaucetNotificationPayload }
