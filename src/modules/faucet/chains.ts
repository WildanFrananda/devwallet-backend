/**
 * Server-side mirror of the mobile `Chain` enum. Keep both lists in sync —
 * the mobile app sends these exact strings as object keys in the faucet
 * request body.
 */
const SUPPORTED_CHAINS = [
  "evm:sepolia",
  "evm:polygon-amoy",
  "evm:base-sepolia",
  "bitcoin:testnet",
  "solana:devnet",
  "cosmos:theta-testnet",
  "xrpl:testnet",
  "starknet:sepolia"
] as const

type SupportedChain = (typeof SUPPORTED_CHAINS)[number]

function isSupportedChain(value: string): value is SupportedChain {
  return (SUPPORTED_CHAINS as ReadonlyArray<string>).includes(value)
}

export { SUPPORTED_CHAINS, isSupportedChain, type SupportedChain }
