import BitcoinFaucetProvider from "./bitcoin.provider"
import { FaucetError } from "./faucet-provider.interface"

describe("BitcoinFaucetProvider", () => {
  const provider = new BitcoinFaucetProvider()

  it("rejects every request with FaucetError carrying manualUrl", async () => {
    await expect(provider.request("tb1qabc")).rejects.toBeInstanceOf(FaucetError)
    try {
      await provider.request("tb1qaddr")
    } catch (err) {
      const fe = err as FaucetError
      expect(fe.retryable).toBe(false)
      expect(fe.manualUrl).toContain("tb1qaddr")
      expect(fe.manualUrl).toMatch(/^https:\/\/coinfaucet\.eu/)
    }
  })

  it("address URL-encodes correctly", async () => {
    try {
      await provider.request("addr with space")
    } catch (err) {
      const fe = err as FaucetError
      expect(fe.manualUrl).toContain("addr%20with%20space")
    }
  })
})
