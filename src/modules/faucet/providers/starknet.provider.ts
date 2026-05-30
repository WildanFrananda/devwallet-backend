import { Inject, Injectable, Logger } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { Account, Contract, RpcProvider, CallData, RpcError } from "starknet"
import type { FaucetProvider, FaucetResult } from "./faucet-provider.interface"
import { FaucetError } from "./faucet-provider.interface"
import { FaucetDispenserCairoAbi } from "./abi/faucet-dispenser.cairo-abi"

const STRK_DECIMALS = 18n
const MANUAL_FALLBACK_URL = "https://starknet-faucet.vercel.app/?address="

type StarknetConfig = {
  rpcUrl: string
  contractAddress: string
  sponsorAddress: string
  sponsorKey: string
}

/**
 * Starknet Sepolia faucet: invokes the deployed Cairo `FaucetDispenser`
 * contract's `drip(recipient)` entrypoint as the sponsor account. The
 * contract transfers STRK to the recipient and emits a `Dripped` event
 * with the amount, which we parse from the receipt.
 *
 * Falls back to the manual deep-link captcha faucet (non-retryable) if
 * the contract / sponsor env vars are missing — useful for local dev
 * before deploy. See `STARKNET_FAUCET_CONTRACT`,
 * `STARKNET_SPONSOR_ADDR`, `STARKNET_SPONSOR_KEY` in `.env`.
 */
@Injectable()
class StarknetFaucetProvider implements FaucetProvider {
  public readonly chain = "starknet:sepolia" as const
  public readonly name = "devwallet-faucet-dispenser-starknet-sepolia"
  private readonly logger = new Logger(StarknetFaucetProvider.name)

  public constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  public async request(address: string): Promise<FaucetResult> {
    if (!/^0x[0-9a-fA-F]{1,64}$/.test(address)) {
      throw new FaucetError(this.chain, this.name, `Invalid Starknet address: ${address}`, false)
    }

    const cfg = this.loadConfig()
    if (cfg === null) {
      throw new FaucetError(
        this.chain,
        this.name,
        "Starknet faucet contract not configured — falling back to manual claim.",
        false,
        `${MANUAL_FALLBACK_URL}${encodeURIComponent(address)}`
      )
    }

    const provider = new RpcProvider({ nodeUrl: cfg.rpcUrl })
    const sponsor = new Account({
      provider,
      address: cfg.sponsorAddress,
      signer: cfg.sponsorKey
    })
    const contract = new Contract({
      abi: FaucetDispenserCairoAbi,
      address: cfg.contractAddress,
      providerOrAccount: sponsor
    })

    try {
      const calldata = CallData.compile({ recipient: address })
      const { transaction_hash } = await contract.invoke("drip", calldata)
      this.logger.log(`drip tx submitted hash=${transaction_hash} recipient=${address}`)

      const receipt = await provider.waitForTransaction(transaction_hash)
      if (!receipt.isSuccess()) {
        throw new FaucetError(this.chain, this.name, `drip tx reverted: ${transaction_hash}`, true)
      }
      const events = (receipt.value as { events?: ReadonlyArray<RawEvent> }).events ?? []
      const amount = this.extractDrippedAmount(events, cfg.contractAddress)
      return {
        txHash: transaction_hash,
        amount: this.formatStrk(amount),
        providerName: this.name
      }
    } catch (err) {
      throw this.wrap(err)
    }
  }

  private loadConfig(): StarknetConfig | null {
    const rpcUrl = this.config.get<string>("STARKNET_RPC_URL")
    const contractAddress = this.config.get<string>("STARKNET_FAUCET_CONTRACT")
    const sponsorAddress = this.config.get<string>("STARKNET_SPONSOR_ADDR")
    const sponsorKey = this.config.get<string>("STARKNET_SPONSOR_KEY")
    if (!rpcUrl || !contractAddress || !sponsorAddress || !sponsorKey) {
      return null
    }
    return { rpcUrl, contractAddress, sponsorAddress, sponsorKey }
  }

  /**
   * `Dripped` event layout: keys = [event_selector, recipient], data =
   * [amount.low, amount.high, next_available_at]. We only care about the
   * amount, so we read the first two data slots and recombine the u256.
   */
  private extractDrippedAmount(
    events: ReadonlyArray<RawEvent>,
    contractAddress: string
  ): bigint {
    const target = BigInt(contractAddress)
    for (const ev of events) {
      if (BigInt(ev.from_address) !== target) continue
      if (ev.data.length < 2) continue
      try {
        const low = BigInt(ev.data[0])
        const high = BigInt(ev.data[1])
        const amount = (high << 128n) + low
        if (amount > 0n) return amount
      } catch {
        // skip non-Dripped events
      }
    }
    return 0n
  }

  private formatStrk(wei: bigint): string {
    if (wei === 0n) return "0"
    const divisor = 10n ** STRK_DECIMALS
    const whole = wei / divisor
    const frac = wei % divisor
    if (frac === 0n) return whole.toString()
    const fracStr = frac.toString().padStart(Number(STRK_DECIMALS), "0").replace(/0+$/, "")
    return `${whole}.${fracStr}`
  }

  private wrap(err: unknown): FaucetError {
    if (err instanceof FaucetError) return err
    const msg = err instanceof RpcError ? err.message : err instanceof Error ? err.message : String(err)
    const retryable = !/CooldownActive|ZeroRecipient|NotOwner|FaucetEmpty/i.test(msg)
    return new FaucetError(this.chain, this.name, msg, retryable)
  }
}

type RawEvent = { from_address: string; data: ReadonlyArray<string> }

export default StarknetFaucetProvider
