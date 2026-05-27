import { Module } from "@nestjs/common"
import { BullModule } from "@nestjs/bullmq"
import { QueueNames } from "./queue.constants"

/**
 * Registers shared queue names so any module can `BullModule.registerQueue`
 * referencing them. Processors live next to the feature that owns them
 * (e.g. FaucetProcessor inside FaucetModule).
 */
@Module({
  imports: [BullModule.registerQueue({ name: QueueNames.Faucet })],
  exports: [BullModule]
})
export class QueueModule {}
