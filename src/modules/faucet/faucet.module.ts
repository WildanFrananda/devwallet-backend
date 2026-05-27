import { Module } from "@nestjs/common"
import { BullModule } from "@nestjs/bullmq"
import { TypeOrmModule } from "@nestjs/typeorm"
import { QueueNames } from "../../infrastructure/queue/queue.constants"
import FaucetRequestEntity from "../../domain/entities/faucet-request.entity"
import FaucetRequestRepository from "../../domain/repositories/faucet-request.repository.interface"
import TypeOrmFaucetRequestRepository from "../../infrastructure/database/repositories/faucet-request.repository"
import FaucetController from "./faucet.controller"
import FaucetService from "./faucet.service"

@Module({
  imports: [
    BullModule.registerQueue({ name: QueueNames.Faucet }),
    TypeOrmModule.forFeature([FaucetRequestEntity])
  ],
  controllers: [FaucetController],
  providers: [
    FaucetService,
    { provide: FaucetRequestRepository, useClass: TypeOrmFaucetRequestRepository }
  ],
  exports: [FaucetService]
})
class FaucetModule {}

export { FaucetModule }
