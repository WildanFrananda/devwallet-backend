import FaucetProviderRegistry from "./provider-registry"
import type { FaucetProvider } from "./faucet-provider.interface"

function stub(chain: string, name: string): FaucetProvider {
  return { chain, name, request: jest.fn() } as unknown as FaucetProvider
}

describe("FaucetProviderRegistry", () => {
  let registry: FaucetProviderRegistry

  beforeEach(() => {
    registry = new FaucetProviderRegistry(
      stub("evm:sepolia", "sepolia") as never,
      stub("evm:polygon-amoy", "amoy") as never,
      stub("evm:base-sepolia", "base") as never,
      stub("bitcoin:testnet", "btc") as never,
      stub("solana:devnet", "sol") as never,
      stub("cosmos:theta-testnet", "cos") as never,
      stub("xrpl:testnet", "xrpl") as never,
      stub("starknet:sepolia", "strk") as never
    )
  })

  it("picks provider by exact chain match", () => {
    expect(registry.pick("evm:sepolia").name).toBe("sepolia")
    expect(registry.pick("xrpl:testnet").name).toBe("xrpl")
    expect(registry.pick("starknet:sepolia").name).toBe("strk")
  })

  it("throws on unsupported chain string", () => {
    expect(() => registry.pick("evm:mainnet")).toThrow(/Unsupported chain/)
  })

  it("throws on empty string", () => {
    expect(() => registry.pick("")).toThrow()
  })
})
