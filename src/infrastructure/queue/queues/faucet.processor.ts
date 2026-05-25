import { Logger } from "@nestjs/common"
import { Processor, WorkerHost } from "@nestjs/bullmq"
import { Job } from "bullmq"
import { QueueNames } from "../queue.constants"

@Processor(QueueNames.Faucet)
class FaucetProcessor extends WorkerHost {
  private readonly logger = new Logger(FaucetProcessor.name)

  public async process(job: Job<unknown>): Promise<{ jobId: string; status: "ok" }> {
    this.logger.log(`processing job ${job.id} name=${job.name}`)
    // Phase 1 replaces this with real chain dispatch.
    await job.updateProgress(100)
    return { jobId: String(job.id), status: "ok" }
  }
}

export default FaucetProcessor
