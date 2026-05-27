import { Inject, Injectable, Logger } from "@nestjs/common"
import { InjectQueue } from "@nestjs/bullmq"
import type { Queue } from "bullmq"
import { QueueNames } from "../../infrastructure/queue/queue.constants"
import FaucetRequestRepository from "../../domain/repositories/faucet-request.repository.interface"
import FaucetRequestEntity from "../../domain/entities/faucet-request.entity"
import { isSupportedChain } from "./chains"

type FaucetJobData = {
  requestId: string
  chain: string
  address: string
  deviceId: string | null
  deviceFingerprint: string
}

type EnqueueInput = {
  addresses: Record<string, string>
  deviceId: string | null
  deviceFingerprint: string
}

type EnqueueOutput = {
  jobs: ReadonlyArray<{ chain: string; requestId: string; jobId: string }>
}

@Injectable()
class FaucetService {
  private readonly logger = new Logger(FaucetService.name)

  public constructor(
    @InjectQueue(QueueNames.Faucet) private readonly queue: Queue<FaucetJobData>,
    @Inject(FaucetRequestRepository) private readonly requests: FaucetRequestRepository
  ) {}

  public async enqueueBatch(input: EnqueueInput): Promise<EnqueueOutput> {
    const entries = Object.entries(input.addresses).filter(([chain]) => isSupportedChain(chain))
    const jobs = await Promise.all(
      entries.map(async ([chain, address]) => {
        const request = await this.requests.create({
          device_id: input.deviceId,
          chain,
          address
        })
        const job = await this.queue.add(
          `faucet:${chain}`,
          {
            requestId: request.id,
            chain,
            address,
            deviceId: input.deviceId,
            deviceFingerprint: input.deviceFingerprint
          },
          { jobId: request.id }
        )
        this.logger.log(`enqueued faucet request id=${request.id} chain=${chain}`)
        return { chain, requestId: request.id, jobId: String(job.id) }
      })
    )
    return { jobs }
  }

  public async findRequest(id: string): Promise<FaucetRequestEntity | null> {
    return this.requests.findById(id)
  }

  public async historyForDevice(deviceId: string, limit: number = 50): Promise<FaucetRequestEntity[]> {
    return this.requests.listByDevice(deviceId, limit)
  }
}

export default FaucetService
export { type FaucetJobData, type EnqueueInput, type EnqueueOutput }
