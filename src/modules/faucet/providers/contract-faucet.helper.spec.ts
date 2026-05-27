import ContractFaucetExecutor from "./contract-faucet.helper"
import { FaucetError } from "./faucet-provider.interface"

const mockSimulate = jest.fn()
const mockWrite = jest.fn()
const mockWaitReceipt = jest.fn()
const mockEstimate = jest.fn()
void mockEstimate

jest.mock("viem", () => {
  const actual = jest.requireActual<typeof import("viem")>("viem")
  return {
    ...actual,
    createPublicClient: () => ({
      simulateContract: mockSimulate,
      waitForTransactionReceipt: mockWaitReceipt
    }),
    createWalletClient: () => ({ writeContract: mockWrite }),
    http: jest.fn(() => ({}))
  }
})

jest.mock("viem/accounts", () => ({
  privateKeyToAccount: () => ({ address: "0xacct" })
}))

function build(formatter: (raw: bigint) => string = String): ContractFaucetExecutor {
  return new ContractFaucetExecutor({
    chain: "evm:sepolia",
    providerName: "test-exec",
    rpcUrl: "https://test/rpc",
    contractAddress: ("0x" + "ab".repeat(20)) as `0x${string}`,
    sponsorKey: ("0x" + "11".repeat(32)) as `0x${string}`,
    viemChain: { id: 11155111, name: "sepolia" } as never,
    amountFormatter: formatter
  })
}

describe("ContractFaucetExecutor", () => {
  beforeEach(() => {
    mockSimulate.mockReset()
    mockWrite.mockReset()
    mockWaitReceipt.mockReset()
  })

  it("rejects malformed address", async () => {
    const exec = build()
    await expect(exec.request("notHex")).rejects.toBeInstanceOf(FaucetError)
    try {
      await exec.request("0xtoo-short")
    } catch (err) {
      expect((err as FaucetError).retryable).toBe(false)
    }
  })

  it("simulates → writes → waits → returns tx + amount", async () => {
    mockSimulate.mockResolvedValue({ request: { abi: [], address: "0xc" } })
    mockWrite.mockResolvedValue("0xtxhash")
    mockWaitReceipt.mockResolvedValue({ status: "success", blockNumber: 1n, logs: [] })

    const exec = build(raw => `formatted-${raw}`)
    const result = await exec.request("0x" + "ee".repeat(20))
    expect(mockSimulate).toHaveBeenCalled()
    expect(mockWrite).toHaveBeenCalled()
    expect(result.txHash).toBe("0xtxhash")
    expect(result.amount).toBe("formatted-0")
  })

  it("reverts on receipt status !== success", async () => {
    mockSimulate.mockResolvedValue({ request: {} })
    mockWrite.mockResolvedValue("0xtx")
    mockWaitReceipt.mockResolvedValue({ status: "reverted", blockNumber: 1n, logs: [] })

    const exec = build()
    try {
      await exec.request("0x" + "ee".repeat(20))
    } catch (err) {
      const fe = err as FaucetError
      expect(fe.retryable).toBe(true)
      expect(fe.message).toMatch(/reverted/)
    }
  })
})
