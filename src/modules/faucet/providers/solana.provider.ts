import { Inject, Injectable, Logger } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { AnchorProvider, BN, Program, Wallet } from "@coral-xyz/anchor"
import { Connection, Keypair, PublicKey } from "@solana/web3.js"
import * as fs from "fs"
import type { FaucetProvider, FaucetResult } from "./faucet-provider.interface"
import { FaucetError } from "./faucet-provider.interface"
import idl from "./idl/dev_faucet.json"
import type { DevFaucet } from "./idl/dev-faucet.types"

const FAUCET_SEED = Buffer.from("faucet")
const LAMPORTS_PER_SOL = 1_000_000_000

@Injectable()
class SolanaFaucetProvider implements FaucetProvider {
  public readonly chain = "solana:devnet" as const
  public readonly name = "devwallet-dev-faucet-solana-devnet"
  private readonly logger = new Logger(SolanaFaucetProvider.name)

  public constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  public async request(address: string): Promise<FaucetResult> {
    const sponsor = this.loadSponsorKeypair()
    if (!sponsor) {
      throw new FaucetError(
        this.chain,
        this.name,
        "SOLANA_SPONSOR_KEYPAIR_PATH / _JSON not configured",
        false
      )
    }
    const programId = new PublicKey(
      this.config.get<string>("SOLANA_FAUCET_PROGRAM_ID") ?? "2UhnWRa3Pu4BqTN7xnZG9jxkmz3cgCEC2AF2Jh5MKgCY"
    )
    const rpcUrl = this.config.get<string>("SOLANA_DEVNET_RPC_URL") ?? "https://api.devnet.solana.com"

    let recipient: PublicKey
    try {
      recipient = new PublicKey(address)
    } catch {
      throw new FaucetError(this.chain, this.name, `Invalid Solana address: ${address}`, false)
    }

    const connection = new Connection(rpcUrl, "confirmed")
    const provider = new AnchorProvider(connection, new Wallet(sponsor), { commitment: "confirmed" })
    const program = new Program<DevFaucet>(idl, provider)

    const [faucetPda] = PublicKey.findProgramAddressSync([FAUCET_SEED, sponsor.publicKey.toBuffer()], programId)

    try {
      const dripState = await program.account.faucetState.fetch(faucetPda)
      const dripLamports = Number(dripState.dripAmount)
      const balance = await connection.getBalance(faucetPda)
      if (balance < dripLamports) {
        throw new FaucetError(this.chain, this.name, `Faucet PDA balance ${balance} < drip ${dripLamports}`, true)
      }
      const tx = await program.methods
        .drip(recipient)
        .accountsPartial({
          authority: sponsor.publicKey,
          faucet: faucetPda,
          recipientAccount: recipient
        })
        .rpc()
      this.logger.log(`Solana drip tx ${tx} → ${address}`)
      return {
        txHash: tx,
        amount: (dripLamports / LAMPORTS_PER_SOL).toString(),
        providerName: this.name
      }
    } catch (err) {
      if (err instanceof FaucetError) throw err
      throw this.wrap(err)
    }
  }

  private loadSponsorKeypair(): Keypair | null {
    const inlineJson = this.config.get<string>("SOLANA_SPONSOR_KEYPAIR_JSON")
    if (inlineJson) {
      const bytes = JSON.parse(inlineJson) as number[]
      return Keypair.fromSecretKey(Uint8Array.from(bytes))
    }
    const path = this.config.get<string>("SOLANA_SPONSOR_KEYPAIR_PATH")
    if (path) {
      const raw = JSON.parse(fs.readFileSync(path, "utf8")) as number[]
      return Keypair.fromSecretKey(Uint8Array.from(raw))
    }
    return null
  }

  private wrap(err: unknown): FaucetError {
    const message = err instanceof Error ? err.message : String(err)
    // Anchor surfaces program errors via AnchorError; cooldown reverts are
    // not retryable at the BullMQ level.
    const retryable = !/CooldownActive|FaucetEmpty/i.test(message)
    return new FaucetError(this.chain, this.name, message, retryable)
  }
}

export default SolanaFaucetProvider
