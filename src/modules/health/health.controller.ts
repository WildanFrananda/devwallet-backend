import { Controller, Get, Inject } from "@nestjs/common"
import { DataSource } from "typeorm"
import Redis from "ioredis"

@Controller("health")
class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    @Inject("REDIS_CLIENT") private readonly redis: Redis
  ) {}

  @Get()
  async check() {
    const dbUp = await this.dataSource.query("SELECT 1").then(() => true).catch(() => false)
    const redisUp = await this.redis.ping().then(r => r === "PONG").catch(() => false)
    return {
      status: dbUp && redisUp ? "ok" : "degraded",
      db: dbUp ? "up" : "down",
      redis: redisUp ? "up" : "down",
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }
  }
}

export default HealthController
