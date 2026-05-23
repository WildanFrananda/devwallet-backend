import { Module } from "@nestjs/common"
import { BullModule } from "@nestjs/bullmq"
import { QueueNames } from "./queue.constants"
import { FaucetProcessor } from "./queues/faucet.processor"

@Module({
  imports: [BullModule.registerQueue({ name: QueueNames.Faucet })],
  providers: [FaucetProcessor],
  exports: [BullModule]
})
export class QueueModule {}
