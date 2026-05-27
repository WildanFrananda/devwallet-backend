import { Injectable, Logger } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import DeviceEntity from "../../domain/entities/device.entity"

type UpsertInput = {
  fingerprint: string
  platform: "ios" | "android"
  pushToken?: string
}

@Injectable()
class DeviceService {
  private readonly logger = new Logger(DeviceService.name)

  public constructor(
    @InjectRepository(DeviceEntity) private readonly devices: Repository<DeviceEntity>
  ) {}

  public async upsert(input: UpsertInput): Promise<DeviceEntity> {
    const existing = await this.devices.findOne({ where: { fingerprint: input.fingerprint } })
    if (existing) {
      existing.platform = input.platform
      if (input.pushToken !== undefined) existing.push_token = input.pushToken
      const updated = await this.devices.save(existing)
      this.logger.log(`Upserted device fingerprint=${input.fingerprint} platform=${input.platform}`)
      return updated
    }
    const created = this.devices.create({
      fingerprint: input.fingerprint,
      platform: input.platform,
      push_token: input.pushToken ?? null
    })
    const saved = await this.devices.save(created)
    this.logger.log(`Created device fingerprint=${input.fingerprint} platform=${input.platform}`)
    return saved
  }
}

export default DeviceService
