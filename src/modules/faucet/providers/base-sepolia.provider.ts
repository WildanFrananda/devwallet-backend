import { Inject, Injectable } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { baseSepolia } from "viem/chains"
import { formatEther, type Address, type Hex } from "viem"
import type { FaucetProvider, FaucetResult } from "./faucet-provider.interface"
import { FaucetError } from "./faucet-provider.interface"
import ContractFaucetExecutor from "./contract-faucet.helper"

@Injectable()
class BaseSepoliaFaucetProvider implements FaucetProvider {
  public readonly chain = "evm:base-sepolia" as const
  public readonly name = "devwallet-faucet-dispenser-base-sepolia"

  public constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  public async request(address: string): Promise<FaucetResult> {
    const sponsorKey = this.config.get<string>("BASE_SEPOLIA_SPONSOR_PRIVATE_KEY")
    const contract = this.config.get<string>("BASE_SEPOLIA_FAUCET_CONTRACT")
    const rpcUrl = this.config.get<string>("BASE_SEPOLIA_RPC_URL") ?? "https://sepolia.base.org"
    if (!sponsorKey || !contract) {
      throw new FaucetError(
        this.chain,
        this.name,
        "BASE_SEPOLIA_SPONSOR_PRIVATE_KEY / BASE_SEPOLIA_FAUCET_CONTRACT not configured",
        false
      )
    }
    const executor = new ContractFaucetExecutor({
      chain: this.chain,
      providerName: this.name,
      rpcUrl,
      contractAddress: contract as Address,
      sponsorKey: sponsorKey as Hex,
      viemChain: baseSepolia,
      amountFormatter: raw => formatEther(raw)
    })
    return executor.request(address)
  }
}

export default BaseSepoliaFaucetProvider
