import { Injectable, Logger } from "@nestjs/common"
import type { FaucetProvider } from "./faucet-provider.interface"
import { FaucetError } from "./faucet-provider.interface"
import { isSupportedChain, type SupportedChain } from "../chains"
import SepoliaFaucetProvider from "./sepolia.provider"
import AmoyFaucetProvider from "./amoy.provider"
import BaseSepoliaFaucetProvider from "./base-sepolia.provider"
import BitcoinFaucetProvider from "./bitcoin.provider"
import SolanaFaucetProvider from "./solana.provider"
import CosmosFaucetProvider from "./cosmos.provider"
import XrplFaucetProvider from "./xrpl.provider"
import StarknetFaucetProvider from "./starknet.provider"

@Injectable()
class FaucetProviderRegistry {
  private readonly logger = new Logger(FaucetProviderRegistry.name)
  private readonly providers: ReadonlyMap<SupportedChain, FaucetProvider>

  public constructor(
    sepolia: SepoliaFaucetProvider,
    amoy: AmoyFaucetProvider,
    baseSepolia: BaseSepoliaFaucetProvider,
    bitcoin: BitcoinFaucetProvider,
    solana: SolanaFaucetProvider,
    cosmos: CosmosFaucetProvider,
    xrpl: XrplFaucetProvider,
    starknet: StarknetFaucetProvider
  ) {
    this.providers = new Map<SupportedChain, FaucetProvider>([
      [sepolia.chain, sepolia],
      [amoy.chain, amoy],
      [baseSepolia.chain, baseSepolia],
      [bitcoin.chain, bitcoin],
      [solana.chain, solana],
      [cosmos.chain, cosmos],
      [xrpl.chain, xrpl],
      [starknet.chain, starknet]
    ])
    this.logger.log(`Registered ${this.providers.size} faucet providers`)
  }

  public pick(chain: string): FaucetProvider {
    if (!isSupportedChain(chain)) {
      throw new FaucetError(chain as SupportedChain, "registry", `Unsupported chain ${chain}`, false)
    }
    const provider = this.providers.get(chain)
    if (!provider) {
      throw new FaucetError(chain, "registry", `No provider registered for ${chain}`, false)
    }
    return provider
  }
}

export default FaucetProviderRegistry
