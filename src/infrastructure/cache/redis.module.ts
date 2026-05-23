import { Global, Module } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import Redis from "ioredis"

@Global()
@Module({
  providers: [
    {
      provide: "REDIS_CLIENT",
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) =>
        new Redis({
          host: cfg.get("REDIS_HOST"),
          port: cfg.get<number>("REDIS_PORT")
        })
    }
  ],
  exports: ["REDIS_CLIENT"]
})
export class RedisModule {}