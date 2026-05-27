import { CanActivate, ExecutionContext, HttpException, HttpStatus, Inject, Injectable, Logger } from "@nestjs/common"
import type { FastifyRequest } from "fastify"
import type Redis from "ioredis"
import { isSupportedChain } from "../chains"

const COOLDOWN_SECONDS = 24 * 3600

type RequestFaucetBody = {
  addresses?: Record<string, string>
  deviceFingerprint?: string
}

/**
 * Enforces 1 successful enqueue per (deviceFingerprint, chain) per 24h.
 *
 * On a request, for each chain in the body the guard:
 *   1. Checks if `faucet:rl:<fingerprint>:<chain>` exists in Redis.
 *      If yes → throw `429 Too Many Requests` with the TTL.
 *   2. Otherwise lets the request through and sets the key with a 24h TTL
 *      after the controller responds.
 *
 * Steps 1 and 2 are not atomic — under heavy concurrent load a user could
 * sneak two requests through. For testnet faucet usage that's acceptable.
 * A SETNX-based atomic claim can land in Phase 3 if abuse appears.
 */
@Injectable()
class FaucetRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(FaucetRateLimitGuard.name)

  public constructor(@Inject("REDIS_CLIENT") private readonly redis: Redis) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>()
    const body = request.body as RequestFaucetBody | undefined
    if (!body) return true
    const fingerprint = body.deviceFingerprint
    if (!fingerprint) return true

    const chains = body.addresses ? Object.keys(body.addresses).filter(isSupportedChain) : []
    if (chains.length === 0) return true

    for (const chain of chains) {
      const key = FaucetRateLimitGuard.key(fingerprint, chain)
      const ttl = await this.redis.ttl(key)
      if (ttl > 0) {
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            error: "Too Many Requests",
            message: `Rate limited on ${chain} — try again in ${ttl}s`,
            chain,
            retryAfterSeconds: ttl
          },
          HttpStatus.TOO_MANY_REQUESTS
        )
      }
    }

    // Mark all chains rate-limited after passing checks.
    await Promise.all(
      chains.map(chain =>
        this.redis.set(FaucetRateLimitGuard.key(fingerprint, chain), "1", "EX", COOLDOWN_SECONDS)
      )
    )
    this.logger.log(`Rate-limit window opened fingerprint=${fingerprint} chains=${chains.length}`)
    return true
  }

  private static key(fingerprint: string, chain: string): string {
    return `faucet:rl:${fingerprint}:${chain}`
  }
}

export default FaucetRateLimitGuard
export { COOLDOWN_SECONDS }
