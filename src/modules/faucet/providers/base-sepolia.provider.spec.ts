import { ConfigService } from "@nestjs/config"
import BaseSepoliaFaucetProvider from "./base-sepolia.provider"
import { FaucetError } from "./faucet-provider.interface"

const mockRequest = jest.fn()
jest.mock("./contract-faucet.helper", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({ request: mockRequest }))
}))

describe("BaseSepoliaFaucetProvider", () => {
  beforeEach(() => mockRequest.mockReset())

  it("rejects when sponsor key missing", async () => {
    const provider = new BaseSepoliaFaucetProvider({ get: () => undefined } as unknown as ConfigService)
    await expect(provider.request("0xabc")).rejects.toBeInstanceOf(FaucetError)
  })

  it("delegates to contract executor", async () => {
    mockRequest.mockResolvedValue({ txHash: "0xbase", amount: "0.005", providerName: "p" })
    const provider = new BaseSepoliaFaucetProvider({
      get: (key: string) => ({
        BASE_SEPOLIA_SPONSOR_PRIVATE_KEY: "0x" + "33".repeat(32),
        BASE_SEPOLIA_FAUCET_CONTRACT: "0x" + "44".repeat(20)
      })[key]
    } as unknown as ConfigService)
    const result = await provider.request("0xdst")
    expect(result.txHash).toBe("0xbase")
  })
})
