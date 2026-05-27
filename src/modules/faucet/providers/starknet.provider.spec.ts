import StarknetFaucetProvider from "./starknet.provider"
import { FaucetError } from "./faucet-provider.interface"

describe("StarknetFaucetProvider", () => {
  const provider = new StarknetFaucetProvider()

  it("rejects every request with non-retryable FaucetError + manualUrl", async () => {
    await expect(provider.request("0x123")).rejects.toBeInstanceOf(FaucetError)
    try {
      await provider.request("0xdeadbeef")
    } catch (err) {
      const fe = err as FaucetError
      expect(fe.retryable).toBe(false)
      expect(fe.manualUrl).toContain("0xdeadbeef")
      expect(fe.manualUrl).toMatch(/^https:\/\/starknet-faucet/)
    }
  })
})
