import { Injectable, Logger } from "@nestjs/common"
import type { FaucetProvider, FaucetResult } from "./faucet-provider.interface"
import { FaucetError } from "./faucet-provider.interface"

/**
 * Bitcoin Testnet4 faucets in the wild (coinfaucet.eu, bitcoinfaucet.uo1.net,
 * mempool.space) all gate behind reCAPTCHA. Headless backend dispatch is not
 * possible without a paid captcha-solving service.
 *
 * Phase 2 strategy: throw a non-retryable `FaucetError` with `manualUrl` set
 * to a web faucet pre-filled with the recipient address. Mobile renders an
 * "Open faucet" button that deep-links to the URL.
 *
 * Phase 3 may swap to a self-hosted regtest faucet or contract with a
 * third-party paid faucet service.
 */
@Injectable()
class BitcoinFaucetProvider implements FaucetProvider {
  public readonly chain = "bitcoin:testnet" as const
  public readonly name = "manual-bitcoin-testnet"
  private readonly logger = new Logger(BitcoinFaucetProvider.name)

  public request(address: string): Promise<FaucetResult> {
    const manualUrl = `https://coinfaucet.eu/en/btc-testnet/?to=${encodeURIComponent(address)}`
    this.logger.warn(`Bitcoin manual faucet → ${manualUrl}`)
    return Promise.reject(
      new FaucetError(
        this.chain,
        this.name,
        `Bitcoin testnet faucet requires captcha. Open the manual URL.`,
        false,
        manualUrl
      )
    )
  }
}

export default BitcoinFaucetProvider
