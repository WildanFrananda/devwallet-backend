import { Logger } from "@nestjs/common"
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbiItem,
  BaseError,
  ContractFunctionRevertedError,
  decodeEventLog,
  type Address,
  type Hex,
  type Chain as ViemChain
} from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { FaucetDispenserAbi } from "./abi/faucet-dispenser.abi"
import { FaucetError } from "./faucet-provider.interface"
import type { FaucetProvider, FaucetResult } from "./faucet-provider.interface"
import type { SupportedChain } from "../chains"

type ContractFaucetConfig = {
  chain: SupportedChain
  providerName: string
  rpcUrl: string
  contractAddress: Address
  sponsorKey: Hex
  viemChain: ViemChain
  amountFormatter: (raw: bigint) => string
}

const DRIPPED_EVENT = parseAbiItem(
  "event Dripped(address indexed recipient, uint256 amount, uint256 nextAvailableAt)"
)

/**
 * Shared implementation for all EVM chains that dispense via their own
 * `FaucetDispenser` contract. Each chain provider just configures address +
 * sponsor key + viem chain definition; the helper handles signing the
 * `drip()` call and extracting the `Dripped` event from the receipt.
 */
class ContractFaucetExecutor implements FaucetProvider {
  public readonly chain: SupportedChain
  public readonly name: string
  private readonly logger: Logger
  private readonly rpcUrl: string
  private readonly contractAddress: Address
  private readonly sponsorKey: Hex
  private readonly viemChain: ViemChain
  private readonly amountFormatter: (raw: bigint) => string

  public constructor(config: ContractFaucetConfig) {
    this.chain = config.chain
    this.name = config.providerName
    this.logger = new Logger(`ContractFaucetExecutor(${config.chain})`)
    this.rpcUrl = config.rpcUrl
    this.contractAddress = config.contractAddress
    this.sponsorKey = config.sponsorKey
    this.viemChain = config.viemChain
    this.amountFormatter = config.amountFormatter
  }

  public async request(address: string): Promise<FaucetResult> {
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new FaucetError(this.chain, this.name, `Invalid EVM address: ${address}`, false)
    }
    const recipient = address as Address
    const account = privateKeyToAccount(this.sponsorKey)
    const transport = http(this.rpcUrl)
    const wallet = createWalletClient({ account, chain: this.viemChain, transport })
    const publicClient = createPublicClient({ chain: this.viemChain, transport })

    try {
      const { request } = await publicClient.simulateContract({
        account,
        address: this.contractAddress,
        abi: FaucetDispenserAbi,
        functionName: "drip",
        args: [recipient]
      })
      const hash = await wallet.writeContract(request)
      this.logger.log(`drip tx submitted hash=${hash} recipient=${recipient}`)
      const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 })
      if (receipt.status !== "success") {
        throw new FaucetError(this.chain, this.name, `drip tx reverted in block ${receipt.blockNumber}`, true)
      }
      const amount = this.extractDrippedAmount(receipt.logs)
      return {
        txHash: hash,
        amount: this.amountFormatter(amount),
        providerName: this.name
      }
    } catch (err) {
      throw this.wrap(err)
    }
  }

  private extractDrippedAmount(
    logs: ReadonlyArray<{ address: string; topics: ReadonlyArray<string>; data: string }>
  ): bigint {
    for (const log of logs) {
      if (log.address.toLowerCase() !== this.contractAddress.toLowerCase()) continue
      try {
        const decoded = decodeEventLog({
          abi: [DRIPPED_EVENT],
          data: log.data as Hex,
          topics: log.topics as [Hex, ...Hex[]]
        })
        if (decoded.eventName === "Dripped") {
          return decoded.args.amount
        }
      } catch {
        // not the event we want; keep scanning
      }
    }
    return 0n
  }

  private wrap(err: unknown): FaucetError {
    if (err instanceof FaucetError) return err
    if (err instanceof BaseError) {
      const revert = err.walk(e => e instanceof ContractFunctionRevertedError)
      if (revert instanceof ContractFunctionRevertedError && revert.data) {
        const errorName = revert.data.errorName
        const retryable = errorName !== "CooldownActive" && errorName !== "ZeroRecipient"
        return new FaucetError(this.chain, this.name, `${errorName}: ${revert.shortMessage}`, retryable)
      }
      return new FaucetError(this.chain, this.name, err.shortMessage, true)
    }
    return new FaucetError(this.chain, this.name, err instanceof Error ? err.message : String(err), true)
  }
}

export default ContractFaucetExecutor
export { type ContractFaucetConfig }
