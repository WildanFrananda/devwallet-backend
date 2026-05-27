import { Inject, Logger } from "@nestjs/common"
import { Processor, WorkerHost } from "@nestjs/bullmq"
import type { Job } from "bullmq"
import { UnrecoverableError } from "bullmq"
import { QueueNames } from "../../infrastructure/queue/queue.constants"
import FaucetRequestRepository from "../../domain/repositories/faucet-request.repository.interface"
import FaucetProviderRegistry from "./providers/provider-registry"
import { FaucetError } from "./providers/faucet-provider.interface"
import FaucetGateway from "./faucet.gateway"
import NotificationService from "../notification/notification.service"
import type { FaucetJobData } from "./faucet.service"

type FaucetJobResult = {
  requestId: string
  txHash: string | null
  amount: string
}

@Processor(QueueNames.Faucet)
class FaucetProcessor extends WorkerHost {
  private readonly logger = new Logger(FaucetProcessor.name)

  public constructor(
    private readonly registry: FaucetProviderRegistry,
    private readonly gateway: FaucetGateway,
    private readonly notifications: NotificationService,
    @Inject(FaucetRequestRepository) private readonly requests: FaucetRequestRepository
  ) {
    super()
  }

  public override async process(job: Job<FaucetJobData>): Promise<FaucetJobResult> {
    const { requestId, chain, address, deviceFingerprint } = job.data
    this.logger.log(`Dispatch faucet job ${job.id} chain=${chain} address=${address}`)
    await this.requests.update(requestId, { status: "processing" })
    this.gateway.emit(deviceFingerprint, { type: "faucet.processing", requestId, chain, address })

    const provider = this.registry.pick(chain)
    try {
      const result = await provider.request(address)
      await this.requests.update(requestId, {
        status: "completed",
        tx_hash: result.txHash,
        amount: result.amount,
        manual_url: result.manualUrl ?? null,
        completed_at: new Date()
      })
      this.gateway.emit(deviceFingerprint, {
        type: "faucet.success",
        requestId,
        chain,
        address,
        txHash: result.txHash,
        amount: result.amount,
        manualUrl: result.manualUrl ?? null
      })
      await this.notifications.sendByFingerprint(deviceFingerprint, {
        title: "Testnet tokens received",
        body: `${result.amount} on ${chain}`,
        data: {
          type: "faucet.success",
          requestId,
          chain,
          txHash: result.txHash ?? ""
        }
      })
      return { requestId, txHash: result.txHash, amount: result.amount }
    } catch (err) {
      const retryable = err instanceof FaucetError ? err.retryable : true
      const message = err instanceof Error ? err.message : String(err)
      const manualUrl = err instanceof FaucetError ? (err.manualUrl ?? null) : null
      const maxAttempts = job.opts.attempts ?? 1
      const isFinalAttempt = !retryable || job.attemptsMade >= maxAttempts - 1
      if (isFinalAttempt) {
        await this.requests.update(requestId, {
          status: "failed",
          error_msg: message,
          manual_url: manualUrl,
          completed_at: new Date()
        })
        this.gateway.emit(deviceFingerprint, {
          type: "faucet.failed",
          requestId,
          chain,
          address,
          error: message,
          manualUrl
        })
        await this.notifications.sendByFingerprint(deviceFingerprint, {
          title: "Faucet failed",
          body: `${chain}: ${message.slice(0, 120)}`,
          data: {
            type: "faucet.failed",
            requestId,
            chain,
            manualUrl: manualUrl ?? ""
          }
        })
        if (!retryable) {
          throw new UnrecoverableError(message)
        }
      }
      throw err
    }
  }
}

export default FaucetProcessor
