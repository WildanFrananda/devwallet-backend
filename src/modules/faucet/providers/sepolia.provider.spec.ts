import { Test } from "@nestjs/testing"
import { ConfigService } from "@nestjs/config"
import SepoliaFaucetProvider from "./sepolia.provider"
import { FaucetError } from "./faucet-provider.interface"

const mockRequest = jest.fn()
jest.mock("./contract-faucet.helper", () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({ request: mockRequest }))
  }
})

function buildProvider(config: Record<string, string | undefined>): SepoliaFaucetProvider {
  return new SepoliaFaucetProvider({
    get: (key: string) => config[key]
  } as unknown as ConfigService)
}

describe("SepoliaFaucetProvider", () => {
  beforeEach(() => {
    mockRequest.mockReset()
  })

  it("throws non-retryable FaucetError when sponsor key missing", async () => {
    const provider = buildProvider({})
    await expect(provider.request("0xabc")).rejects.toBeInstanceOf(FaucetError)
    try {
      await provider.request("0xabc")
    } catch (err) {
      const fe = err as FaucetError
      expect(fe.retryable).toBe(false)
      expect(fe.message).toMatch(/SEPOLIA_SPONSOR_PRIVATE_KEY/)
    }
  })

  it("delegates to ContractFaucetExecutor when configured", async () => {
    mockRequest.mockResolvedValue({ txHash: "0xtx", amount: "0.005", providerName: "p" })
    const provider = buildProvider({
      SEPOLIA_SPONSOR_PRIVATE_KEY: "0x" + "11".repeat(32),
      SEPOLIA_FAUCET_CONTRACT: "0x" + "ab".repeat(20),
      SEPOLIA_RPC_URL: "https://test/sep"
    })
    const result = await provider.request("0xrecipient")
    expect(mockRequest).toHaveBeenCalledWith("0xrecipient")
    expect(result.txHash).toBe("0xtx")
  })

  it("uses Test moduleRef DI path too", async () => {
    mockRequest.mockResolvedValue({ txHash: "0x1", amount: "0.005", providerName: "p" })
    const moduleRef = await Test.createTestingModule({
      providers: [
        SepoliaFaucetProvider,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => ({
              SEPOLIA_SPONSOR_PRIVATE_KEY: "0x" + "22".repeat(32),
              SEPOLIA_FAUCET_CONTRACT: "0x" + "cd".repeat(20),
              SEPOLIA_RPC_URL: "https://rpc"
            })[key]
          }
        }
      ]
    }).compile()
    const provider = moduleRef.get(SepoliaFaucetProvider)
    const result = await provider.request("0x" + "00".repeat(20))
    expect(result.txHash).toBe("0x1")
  })
})
