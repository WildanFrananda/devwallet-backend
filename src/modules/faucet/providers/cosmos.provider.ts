import { Injectable, Logger } from "@nestjs/common"
import axios, { AxiosError } from "axios"
import type { FaucetProvider, FaucetResult } from "./faucet-provider.interface"
import { FaucetError } from "./faucet-provider.interface"

// Provider testnet faucet — chain ID `provider` is the polypore replacement
// for the deprecated theta-testnet. Endpoint discovered via root HTML:
//   GET /request?address=...&chain=provider
// Response: { address, amount, chain, hash, status }
const COSMOS_FAUCET_URL = "https://faucet.polypore.xyz/request"

type CosmosFaucetResponse = {
  address?: string
  amount?: string  // e.g. "10000000uatom"
  chain?: string
  hash?: string
  message?: string
  status?: string
}

@Injectable()
class CosmosFaucetProvider implements FaucetProvider {
  public readonly chain = "cosmos:theta-testnet" as const
  public readonly name = "polypore-provider-testnet"
  private readonly logger = new Logger(CosmosFaucetProvider.name)

  public async request(address: string): Promise<FaucetResult> {
    try {
      const { data } = await axios.get<CosmosFaucetResponse>(COSMOS_FAUCET_URL, {
        params: { address, chain: "provider" },
        timeout: 30000
      })
      if (data.status !== "success") {
        const detail = data.message ?? `status=${data.status ?? "unknown"}`
        const retryable = !/24 hours|once every/i.test(detail)
        throw new FaucetError(this.chain, this.name, `Cosmos faucet: ${detail}`, retryable)
      }
      const amountAtom = CosmosFaucetProvider.parseAmount(data.amount)
      this.logger.log(`Cosmos faucet credited ${address} (hash=${data.hash ?? "none"})`)
      return {
        txHash: data.hash ?? null,
        amount: amountAtom,
        providerName: this.name
      }
    } catch (err) {
      if (err instanceof FaucetError) throw err
      throw this.wrap(err)
    }
  }

  /**
   * "10000000uatom" → "10.000000" (denom is uatom = 1e-6 ATOM).
   */
  private static parseAmount(raw: string | undefined): string {
    if (!raw) return "0"
    const match = raw.match(/^(\d+)([a-z]+)$/i)
    if (!match) return raw
    const microRaw = match[1]
    if (!microRaw) return raw
    const denom = (match[2] ?? "").toLowerCase()
    if (denom !== "uatom") return microRaw
    const micro = BigInt(microRaw)
    const whole = micro / 1_000_000n
    const frac = (micro % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "")
    return frac.length > 0 ? `${whole}.${frac}` : whole.toString()
  }

  private wrap(err: unknown): FaucetError {
    if (err instanceof AxiosError) {
      const status = err.response?.status ?? 0
      const body = typeof err.response?.data === "string" ? err.response.data : JSON.stringify(err.response?.data ?? {})
      return new FaucetError(
        this.chain,
        this.name,
        `Cosmos faucet returned ${status}: ${body.slice(0, 200)}`,
        status === 0 || status >= 500
      )
    }
    return new FaucetError(this.chain, this.name, err instanceof Error ? err.message : String(err), true)
  }
}

export default CosmosFaucetProvider
