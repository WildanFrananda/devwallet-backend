import { Inject, Injectable } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { polygonAmoy } from "viem/chains"
import { formatEther, type Address, type Hex } from "viem"
import type { FaucetProvider, FaucetResult } from "./faucet-provider.interface"
import { FaucetError } from "./faucet-provider.interface"
import ContractFaucetExecutor from "./contract-faucet.helper"

@Injectable()
class AmoyFaucetProvider implements FaucetProvider {
  public readonly chain = "evm:polygon-amoy" as const
  public readonly name = "devwallet-faucet-dispenser-amoy"

  public constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  public async request(address: string): Promise<FaucetResult> {
    const sponsorKey = this.config.get<string>("AMOY_SPONSOR_PRIVATE_KEY")
    const contract = this.config.get<string>("AMOY_FAUCET_CONTRACT")
    const rpcUrl = this.config.get<string>("AMOY_RPC_URL") ?? "https://rpc-amoy.polygon.technology"
    if (!sponsorKey || !contract) {
      throw new FaucetError(
        this.chain,
        this.name,
        "AMOY_SPONSOR_PRIVATE_KEY / AMOY_FAUCET_CONTRACT not configured",
        false
      )
    }
    const executor = new ContractFaucetExecutor({
      chain: this.chain,
      providerName: this.name,
      rpcUrl,
      contractAddress: contract as Address,
      sponsorKey: sponsorKey as Hex,
      viemChain: polygonAmoy,
      amountFormatter: raw => formatEther(raw)
    })
    return executor.request(address)
  }
}

export default AmoyFaucetProvider
