import { ConfigService } from "@nestjs/config"
import SolanaFaucetProvider from "./solana.provider"
import { FaucetError } from "./faucet-provider.interface"

const mockRpc = jest.fn()
const mockFetch = jest.fn()
const mockGetBalance = jest.fn()

jest.mock("@coral-xyz/anchor", () => {
  return {
    AnchorProvider: jest.fn(),
    Wallet: jest.fn(),
    BN: class BN {
      private readonly v: string
      constructor(v: string | number) { this.v = String(v) }
      public toString(): string { return this.v }
      public toNumber(): number { return Number(this.v) }
    },
    Program: jest.fn().mockImplementation(() => ({
      account: { faucetState: { fetch: mockFetch } },
      methods: {
        drip: () => ({
          accountsPartial: () => ({ rpc: mockRpc })
        })
      }
    }))
  }
})

jest.mock("@solana/web3.js", () => {
  return {
    Connection: jest.fn().mockImplementation(() => ({ getBalance: mockGetBalance })),
    Keypair: {
      fromSecretKey: jest.fn(() => ({
        publicKey: { toBase58: () => "AUTH", toBuffer: () => Buffer.from("auth") }
      }))
    },
    PublicKey: class PublicKey {
      private readonly key: string
      constructor(input: string | Buffer | object) {
        if (typeof input === "string") this.key = input
        else this.key = "valid"
      }
      public toBase58(): string { return this.key }
      public toBuffer(): Buffer { return Buffer.from(this.key) }
      public static findProgramAddressSync(): [{ toBase58: () => string; toBuffer: () => Buffer }, number] {
        return [{ toBase58: () => "PDA", toBuffer: () => Buffer.from("pda") }, 254]
      }
    }
  }
})

jest.mock("fs", () => ({
  readFileSync: jest.fn(() => JSON.stringify(new Array(64).fill(1)))
}))

describe("SolanaFaucetProvider", () => {
  let provider: SolanaFaucetProvider

  beforeEach(() => {
    mockRpc.mockReset()
    mockFetch.mockReset()
    mockGetBalance.mockReset()
  })

  function build(config: Record<string, string | undefined>): SolanaFaucetProvider {
    return new SolanaFaucetProvider({
      get: (key: string) => config[key]
    } as unknown as ConfigService)
  }

  it("rejects when sponsor not configured", async () => {
    provider = build({})
    await expect(provider.request("validAddr")).rejects.toBeInstanceOf(FaucetError)
    try {
      await provider.request("validAddr")
    } catch (err) {
      expect((err as FaucetError).retryable).toBe(false)
    }
  })

  it("returns tx + amount on success", async () => {
    provider = build({ SOLANA_SPONSOR_KEYPAIR_PATH: "/tmp/fake.json" })
    mockFetch.mockResolvedValue({ dripAmount: "5000000" })
    mockGetBalance.mockResolvedValue(1_000_000_000)
    mockRpc.mockResolvedValue("airdrop-sig-abc")

    const result = await provider.request("recipientAddr")
    expect(result.txHash).toBe("airdrop-sig-abc")
    expect(result.amount).toBe("0.005")
  })

  it("rejects retryable when faucet PDA empty", async () => {
    provider = build({ SOLANA_SPONSOR_KEYPAIR_PATH: "/tmp/fake.json" })
    mockFetch.mockResolvedValue({ dripAmount: "5000000" })
    mockGetBalance.mockResolvedValue(0)

    try {
      await provider.request("recipientAddr")
    } catch (err) {
      const fe = err as FaucetError
      expect(fe.retryable).toBe(true)
      expect(fe.message).toMatch(/PDA balance/)
    }
  })

  it("non-retryable when cooldown error thrown", async () => {
    provider = build({ SOLANA_SPONSOR_KEYPAIR_PATH: "/tmp/fake.json" })
    mockFetch.mockResolvedValue({ dripAmount: "5000000" })
    mockGetBalance.mockResolvedValue(1_000_000_000)
    mockRpc.mockRejectedValue(new Error("AnchorError: CooldownActive"))

    try {
      await provider.request("recipientAddr")
    } catch (err) {
      const fe = err as FaucetError
      expect(fe.retryable).toBe(false)
    }
  })
})
