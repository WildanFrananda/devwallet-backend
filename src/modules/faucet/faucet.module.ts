import { Module } from "@nestjs/common"
import { BullModule } from "@nestjs/bullmq"
import { TypeOrmModule } from "@nestjs/typeorm"
import { QueueNames } from "../../infrastructure/queue/queue.constants"
import FaucetRequestEntity from "../../domain/entities/faucet-request.entity"
import FaucetRequestRepository from "../../domain/repositories/faucet-request.repository.interface"
import TypeOrmFaucetRequestRepository from "../../infrastructure/database/repositories/faucet-request.repository"
import FaucetController from "./faucet.controller"
import FaucetService from "./faucet.service"
import FaucetProcessor from "./faucet.processor"
import FaucetGateway from "./faucet.gateway"
import FaucetRateLimitGuard from "./guards/rate-limit.guard"
import FaucetProviderRegistry from "./providers/provider-registry"
import SepoliaFaucetProvider from "./providers/sepolia.provider"
import AmoyFaucetProvider from "./providers/amoy.provider"
import BaseSepoliaFaucetProvider from "./providers/base-sepolia.provider"
import BitcoinFaucetProvider from "./providers/bitcoin.provider"
import SolanaFaucetProvider from "./providers/solana.provider"
import CosmosFaucetProvider from "./providers/cosmos.provider"
import XrplFaucetProvider from "./providers/xrpl.provider"
import StarknetFaucetProvider from "./providers/starknet.provider"

@Module({
  imports: [
    BullModule.registerQueue({
      name: QueueNames.Faucet,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: { age: 24 * 3600 },
        removeOnFail: { age: 7 * 24 * 3600 }
      }
    }),
    TypeOrmModule.forFeature([FaucetRequestEntity])
  ],
  controllers: [FaucetController],
  providers: [
    FaucetService,
    FaucetProcessor,
    FaucetGateway,
    FaucetRateLimitGuard,
    FaucetProviderRegistry,
    SepoliaFaucetProvider,
    AmoyFaucetProvider,
    BaseSepoliaFaucetProvider,
    BitcoinFaucetProvider,
    SolanaFaucetProvider,
    CosmosFaucetProvider,
    XrplFaucetProvider,
    StarknetFaucetProvider,
    { provide: FaucetRequestRepository, useClass: TypeOrmFaucetRequestRepository }
  ],
  exports: [FaucetService]
})
class FaucetModule {}

export { FaucetModule }
