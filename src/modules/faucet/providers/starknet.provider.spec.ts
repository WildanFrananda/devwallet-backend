import { ConfigService } from "@nestjs/config"
import StarknetFaucetProvider from "./starknet.provider"
import { FaucetError } from "./faucet-provider.interface"

const mockInvoke = jest.fn()
const mockWaitForTransaction = jest.fn()

jest.mock("starknet", () => {
  const actual = jest.requireActual<Record<string, unknown>>("starknet")
  return {
    ...actual,
    Account: jest.fn().mockImplementation(() => ({})),
    Contract: jest.fn().mockImplementation(() => ({ invoke: mockInvoke })),
    RpcProvider: jest.fn().mockImplementation(() => ({
      waitForTransaction: mockWaitForTransaction
    }))
  }
})

function buildProvider(config: Record<string, string | undefined>): StarknetFaucetProvider {
  return new StarknetFaucetProvider({
    get: (key: string) => config[key]
  } as unknown as ConfigService)
}

function fullConfig(): Record<string, string> {
  return {
    STARKNET_RPC_URL: "https://test/starknet",
    STARKNET_FAUCET_CONTRACT: "0x" + "ab".repeat(32),
    STARKNET_SPONSOR_ADDR: "0x" + "cd".repeat(32),
    STARKNET_SPONSOR_KEY: "0x" + "11".repeat(32)
  }
}

describe("StarknetFaucetProvider", () => {
  beforeEach(() => {
    mockInvoke.mockReset()
    mockWaitForTransaction.mockReset()
  })

  it("rejects malformed addresses with non-retryable FaucetError", async () => {
    const provider = buildProvider(fullConfig())
    await expect(provider.request("not-a-hex-string")).rejects.toBeInstanceOf(FaucetError)
    try {
      await provider.request("not-a-hex-string")
    } catch (err) {
      const fe = err as FaucetError
      expect(fe.retryable).toBe(false)
      expect(fe.message).toMatch(/Invalid Starknet address/)
    }
  })

  it("falls back to manual URL when contract env vars are missing", async () => {
    const provider = buildProvider({})
    try {
      await provider.request("0xdeadbeef")
      fail("expected throw")
    } catch (err) {
      const fe = err as FaucetError
      expect(fe.retryable).toBe(false)
      expect(fe.manualUrl).toContain("0xdeadbeef")
      expect(fe.manualUrl).toMatch(/^https:\/\/starknet-faucet/)
    }
  })

  it("invokes drip() and returns formatted STRK amount from Dripped event", async () => {
    const contractAddr = "0x" + "ab".repeat(32)
    mockInvoke.mockResolvedValue({ transaction_hash: "0xhash" })
    mockWaitForTransaction.mockResolvedValue({
      isSuccess: () => true,
      value: {
        events: [
          {
            from_address: contractAddr,
            // amount = 1 STRK = 1e18 wei → low = 1e18, high = 0
            data: ["0xde0b6b3a7640000", "0x0", "0x123"]
          }
        ]
      }
    })
    const provider = buildProvider(fullConfig())
    const result = await provider.request("0x" + "ee".repeat(32))
    expect(mockInvoke).toHaveBeenCalled()
    expect(result.txHash).toBe("0xhash")
    expect(result.amount).toBe("1")
    expect(result.providerName).toMatch(/devwallet-faucet-dispenser-starknet/)
  })

  it("marks CooldownActive as non-retryable", async () => {
    mockInvoke.mockRejectedValue(new Error("CooldownActive: try again later"))
    const provider = buildProvider(fullConfig())
    try {
      await provider.request("0x" + "ee".repeat(32))
      fail("expected throw")
    } catch (err) {
      const fe = err as FaucetError
      expect(fe.retryable).toBe(false)
      expect(fe.message).toMatch(/CooldownActive/)
    }
  })

  it("marks generic RPC errors as retryable", async () => {
    mockInvoke.mockRejectedValue(new Error("Network timeout"))
    const provider = buildProvider(fullConfig())
    try {
      await provider.request("0x" + "ee".repeat(32))
      fail("expected throw")
    } catch (err) {
      const fe = err as FaucetError
      expect(fe.retryable).toBe(true)
    }
  })
})
