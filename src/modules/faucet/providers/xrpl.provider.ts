import { Injectable, Logger } from "@nestjs/common"
import axios, { AxiosError } from "axios"
import type { FaucetProvider, FaucetResult } from "./faucet-provider.interface"
import { FaucetError } from "./faucet-provider.interface"

const XRPL_FAUCET_URL = "https://faucet.altnet.rippletest.net/accounts"

type XrplFaucetResponse = {
  account?: { address: string; balance?: number }
  balance?: number
  amount?: number
  transactionHash?: string
}

@Injectable()
class XrplFaucetProvider implements FaucetProvider {
  public readonly chain = "xrpl:testnet" as const
  public readonly name = "xrpl.org-built-in"
  private readonly logger = new Logger(XrplFaucetProvider.name)

  public async request(address: string): Promise<FaucetResult> {
    try {
      const { data } = await axios.post<XrplFaucetResponse>(
        XRPL_FAUCET_URL,
        { destination: address, xrpAmount: "1000" },
        { timeout: 15000, headers: { "Content-Type": "application/json" } }
      )
      const amountXrp = data.amount ?? data.balance ?? 1000
      this.logger.log(`XRPL faucet credited ${amountXrp} XRP to ${address}`)
      return {
        txHash: data.transactionHash ?? null,
        amount: String(amountXrp),
        providerName: this.name
      }
    } catch (err) {
      throw this.wrap(err)
    }
  }

  private wrap(err: unknown): FaucetError {
    if (err instanceof AxiosError) {
      const status = err.response?.status ?? 0
      const body = typeof err.response?.data === "string" ? err.response.data : JSON.stringify(err.response?.data ?? {})
      return new FaucetError(
        this.chain,
        this.name,
        `XRPL faucet returned ${status}: ${body.slice(0, 200)}`,
        status === 0 || status >= 500
      )
    }
    return new FaucetError(this.chain, this.name, err instanceof Error ? err.message : String(err), true)
  }
}

export default XrplFaucetProvider
