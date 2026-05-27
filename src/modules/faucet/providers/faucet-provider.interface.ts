import type { SupportedChain } from "../chains"

type FaucetResult = {
  txHash: string | null  // Some HTTP faucets return only "ok"; UI handles null.
  amount: string         // Numeric string (no unit). Column is decimal(20,8).
                         // Symbol is derived from chain at render time.
  providerName: string   // For audit/logs.
  manualUrl?: string     // For captcha-only chains. Mobile renders an
                         // "Open faucet" button that deep-links to this URL
                         // with the user's address pre-filled in the query
                         // string (where the upstream supports it).
}

class FaucetError extends Error {
  public readonly chain: SupportedChain
  public readonly providerName: string
  public readonly retryable: boolean
  public readonly manualUrl: string | undefined

  public constructor(
    chain: SupportedChain,
    providerName: string,
    message: string,
    retryable: boolean = true,
    manualUrl?: string
  ) {
    super(message)
    this.name = "FaucetError"
    this.chain = chain
    this.providerName = providerName
    this.retryable = retryable
    this.manualUrl = manualUrl
  }
}

interface FaucetProvider {
  readonly chain: SupportedChain
  readonly name: string
  request(address: string): Promise<FaucetResult>
}

export { type FaucetProvider, type FaucetResult, FaucetError }
