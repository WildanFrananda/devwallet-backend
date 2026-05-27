import { Module } from "@nestjs/common"
import { ConfigModule, ConfigService } from "@nestjs/config"
import { TypeOrmModule } from "@nestjs/typeorm"
import { BullModule } from "@nestjs/bullmq"
import { envValidationSchema } from "./config/env.validation"
import { RedisModule } from "./infrastructure/cache/redis.module"
import { QueueModule } from "./infrastructure/queue/queue.module"
import HealthController from "./modules/health/health.controller"
import { WebhookModule } from "./modules/webhook/webhook.module"
import { FaucetModule } from "./modules/faucet/faucet.module"

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
      validationSchema: envValidationSchema
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: "postgres",
        host: cfg.get("DATABASE_HOST"),
        port: cfg.get<number>("DATABASE_PORT"),
        username: cfg.get("DATABASE_USER"),
        password: cfg.get("DATABASE_PASSWORD"),
        database: cfg.get("DATABASE_NAME"),
        entities: [__dirname + "/domain/entities/*.entity{.ts,.js}"],
        synchronize: false,
        migrationsRun: false
      })
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        connection: {
          host: cfg.get("REDIS_HOST"),
          port: cfg.get<number>("REDIS_PORT")
        }
      })
    }),
    RedisModule,
    QueueModule,
    WebhookModule,
    FaucetModule
  ],
  controllers: [
    HealthController
  ]
})
export class AppModule {}
