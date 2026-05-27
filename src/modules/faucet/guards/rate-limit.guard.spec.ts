import { HttpException, HttpStatus } from "@nestjs/common"
import type { ExecutionContext } from "@nestjs/common"
import FaucetRateLimitGuard from "./rate-limit.guard"

type RedisMock = {
  ttl: jest.Mock
  set: jest.Mock
  exists: jest.Mock
}

function makeContext(body: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ body })
    })
  } as unknown as ExecutionContext
}

describe("FaucetRateLimitGuard", () => {
  let redis: RedisMock
  let guard: FaucetRateLimitGuard

  beforeEach(() => {
    redis = {
      ttl: jest.fn().mockResolvedValue(-2),
      set: jest.fn().mockResolvedValue("OK"),
      exists: jest.fn().mockResolvedValue(0)
    }
    guard = new FaucetRateLimitGuard(redis as never)
  })

  it("passes when no fingerprint", async () => {
    const ok = await guard.canActivate(makeContext({ addresses: { "evm:sepolia": "0xa" } }))
    expect(ok).toBe(true)
    expect(redis.set).not.toHaveBeenCalled()
  })

  it("passes + marks all chains when none rate-limited", async () => {
    const ok = await guard.canActivate(
      makeContext({
        addresses: { "evm:sepolia": "0xa", "xrpl:testnet": "rABC" },
        deviceFingerprint: "fp-001"
      })
    )
    expect(ok).toBe(true)
    expect(redis.set).toHaveBeenCalledTimes(2)
    expect(redis.set).toHaveBeenCalledWith("faucet:rl:fp-001:evm:sepolia", "1", "EX", 24 * 3600)
  })

  it("throws 429 with retryAfterSeconds when chain rate-limited", async () => {
    redis.ttl.mockResolvedValueOnce(3600)
    await expect(
      guard.canActivate(
        makeContext({
          addresses: { "evm:sepolia": "0xa" },
          deviceFingerprint: "fp-002"
        })
      )
    ).rejects.toMatchObject({
      getStatus: expect.any(Function) as () => number
    })
    // Re-throw to capture the exception object for direct inspection.
    try {
      await guard.canActivate(
        makeContext({
          addresses: { "evm:sepolia": "0xa" },
          deviceFingerprint: "fp-002"
        })
      )
    } catch (err) {
      const exception = err as HttpException
      expect(exception.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS)
      const response = exception.getResponse() as { chain: string; retryAfterSeconds: number }
      expect(response.chain).toBe("evm:sepolia")
      expect(response.retryAfterSeconds).toBe(3600)
    }
  })

  it("skips unsupported chain keys silently", async () => {
    await guard.canActivate(
      makeContext({
        addresses: { "evm:mainnet": "0xa" },
        deviceFingerprint: "fp-003"
      })
    )
    expect(redis.set).not.toHaveBeenCalled()
  })

  it("returns true without body", async () => {
    const ok = await guard.canActivate(makeContext(undefined))
    expect(ok).toBe(true)
  })
})
