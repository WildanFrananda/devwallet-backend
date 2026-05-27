import { UnrecoverableError } from "bullmq"
import type { Job } from "bullmq"
import FaucetProcessor from "./faucet.processor"
import FaucetProviderRegistry from "./providers/provider-registry"
import FaucetGateway from "./faucet.gateway"
import NotificationService from "../notification/notification.service"
import FaucetRequestRepository from "../../domain/repositories/faucet-request.repository.interface"
import { FaucetError } from "./providers/faucet-provider.interface"
import type { FaucetJobData } from "./faucet.service"

type FakeProvider = {
  chain: string
  name: string
  request: jest.Mock
}

function makeJob(overrides: Partial<FaucetJobData> = {}, attemptsMade = 0): Job<FaucetJobData> {
  const data: FaucetJobData = {
    requestId: "req-1",
    chain: "evm:sepolia",
    address: "0xrecipient",
    deviceId: null,
    deviceFingerprint: "fp-aaa",
    ...overrides
  }
  return {
    id: "job-1",
    data,
    attemptsMade,
    opts: { attempts: 3 }
  } as unknown as Job<FaucetJobData>
}

describe("FaucetProcessor", () => {
  let processor: FaucetProcessor
  let registry: { pick: jest.Mock }
  let gateway: { emit: jest.Mock }
  let notifications: { sendByFingerprint: jest.Mock }
  let repo: { update: jest.Mock }
  let provider: FakeProvider

  beforeEach(() => {
    provider = {
      chain: "evm:sepolia",
      name: "test-provider",
      request: jest.fn()
    }
    registry = { pick: jest.fn().mockReturnValue(provider) }
    gateway = { emit: jest.fn() }
    notifications = { sendByFingerprint: jest.fn().mockResolvedValue(undefined) }
    repo = { update: jest.fn().mockResolvedValue(undefined) }
    processor = new FaucetProcessor(
      registry as unknown as FaucetProviderRegistry,
      gateway as unknown as FaucetGateway,
      notifications as unknown as NotificationService,
      repo as unknown as FaucetRequestRepository
    )
  })

  it("happy path: writes completed, emits success, sends notification", async () => {
    provider.request.mockResolvedValue({ txHash: "0xabc", amount: "0.005", providerName: "p" })
    const result = await processor.process(makeJob())

    expect(repo.update).toHaveBeenCalledWith("req-1", { status: "processing" })
    expect(repo.update).toHaveBeenCalledWith(
      "req-1",
      expect.objectContaining({ status: "completed", tx_hash: "0xabc", amount: "0.005" })
    )
    expect(gateway.emit).toHaveBeenCalledWith("fp-aaa", expect.objectContaining({ type: "faucet.processing" }))
    expect(gateway.emit).toHaveBeenCalledWith("fp-aaa", expect.objectContaining({ type: "faucet.success" }))
    expect(notifications.sendByFingerprint).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ requestId: "req-1", txHash: "0xabc", amount: "0.005" })
  })

  it("non-retryable error: marks failed, throws UnrecoverableError, emits failed once", async () => {
    provider.request.mockRejectedValue(
      new FaucetError("evm:sepolia", "p", "captcha required", false, "https://faucet.example/?to=0x")
    )

    await expect(processor.process(makeJob())).rejects.toBeInstanceOf(UnrecoverableError)
    expect(repo.update).toHaveBeenCalledWith(
      "req-1",
      expect.objectContaining({
        status: "failed",
        error_msg: "captcha required",
        manual_url: "https://faucet.example/?to=0x"
      })
    )
    expect(gateway.emit).toHaveBeenCalledWith("fp-aaa", expect.objectContaining({ type: "faucet.failed" }))
    expect(notifications.sendByFingerprint).toHaveBeenCalledTimes(1)
  })

  it("retryable error mid-attempt: does NOT mark failed, re-throws raw", async () => {
    const err = new FaucetError("evm:sepolia", "p", "transient", true)
    provider.request.mockRejectedValue(err)

    await expect(processor.process(makeJob({}, 0))).rejects.toBe(err)
    // attemptsMade=0, maxAttempts=3 → not final, no failed update
    const failedUpdate = (repo.update.mock.calls as ReadonlyArray<[string, { status?: string }]>).find(
      c => c[1].status === "failed"
    )
    expect(failedUpdate).toBeUndefined()
  })

  it("retryable error on final attempt: marks failed", async () => {
    const err = new FaucetError("evm:sepolia", "p", "transient", true)
    provider.request.mockRejectedValue(err)

    await expect(processor.process(makeJob({}, 2))).rejects.toBe(err)
    expect(repo.update).toHaveBeenCalledWith(
      "req-1",
      expect.objectContaining({ status: "failed", error_msg: "transient" })
    )
  })
})
