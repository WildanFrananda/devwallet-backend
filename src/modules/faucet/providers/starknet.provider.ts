import { Injectable, Logger } from "@nestjs/common"
import type { FaucetProvider, FaucetResult } from "./faucet-provider.interface"
import { FaucetError } from "./faucet-provider.interface"

/**
 * Starknet Sepolia: PRD §4.2 originally listed an "API" but in reality the
 * Starknet faucet is captcha-gated web UI (faucet.starknet.io). Phase 2
 * ships Starknet as a manual deep-link. Phase 3 will deploy a Cairo
 * `FaucetDispenser` contract (Scarb + Starknet Foundry) bundled with the
 * Phase 1 carry-over account-deploy work.
 */
@Injectable()
class StarknetFaucetProvider implements FaucetProvider {
  public readonly chain = "starknet:sepolia" as const
  public readonly name = "manual-starknet-sepolia"
  private readonly logger = new Logger(StarknetFaucetProvider.name)

  public request(address: string): Promise<FaucetResult> {
    const manualUrl = `https://starknet-faucet.vercel.app/?address=${encodeURIComponent(address)}`
    this.logger.warn(`Starknet manual faucet → ${manualUrl}`)
    return Promise.reject(
      new FaucetError(
        this.chain,
        this.name,
        `Starknet faucet requires manual claim. Cairo on-chain dispenser arrives in Phase 3.`,
        false,
        manualUrl
      )
    )
  }
}

export default StarknetFaucetProvider
