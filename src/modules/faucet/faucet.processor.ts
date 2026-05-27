import { Inject, Logger } from "@nestjs/common"
import { Processor, WorkerHost } from "@nestjs/bullmq"
import type { Job } from "bullmq"
import { QueueNames } from "../../infrastructure/queue/queue.constants"
import FaucetRequestRepository from "../../domain/repositories/faucet-request.repository.interface"
import FaucetProviderRegistry from "./providers/provider-registry"
import { FaucetError } from "./providers/faucet-provider.interface"
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
    @Inject(FaucetRequestRepository) private readonly requests: FaucetRequestRepository
  ) {
    super()
  }

  public override async process(job: Job<FaucetJobData>): Promise<FaucetJobResult> {
    const { requestId, chain, address } = job.data
    this.logger.log(`Dispatch faucet job ${job.id} chain=${chain} address=${address}`)
    await this.requests.update(requestId, { status: "processing" })

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
      }
      throw err
    }
  }
}

export default FaucetProcessor
