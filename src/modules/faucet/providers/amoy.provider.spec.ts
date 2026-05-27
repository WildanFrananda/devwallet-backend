import { ConfigService } from "@nestjs/config"
import AmoyFaucetProvider from "./amoy.provider"
import { FaucetError } from "./faucet-provider.interface"

const mockRequest = jest.fn()
jest.mock("./contract-faucet.helper", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({ request: mockRequest }))
}))

describe("AmoyFaucetProvider", () => {
  beforeEach(() => mockRequest.mockReset())

  it("rejects when sponsor key missing", async () => {
    const provider = new AmoyFaucetProvider({ get: () => undefined } as unknown as ConfigService)
    await expect(provider.request("0xabc")).rejects.toBeInstanceOf(FaucetError)
  })

  it("delegates to contract executor when configured", async () => {
    mockRequest.mockResolvedValue({ txHash: "0xpol", amount: "0.005", providerName: "p" })
    const provider = new AmoyFaucetProvider({
      get: (key: string) => ({
        AMOY_SPONSOR_PRIVATE_KEY: "0x" + "aa".repeat(32),
        AMOY_FAUCET_CONTRACT: "0x" + "bb".repeat(20)
      })[key]
    } as unknown as ConfigService)
    const result = await provider.request("0xdest")
    expect(mockRequest).toHaveBeenCalledWith("0xdest")
    expect(result.amount).toBe("0.005")
  })
})
