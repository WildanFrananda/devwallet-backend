import axios from "axios"
import CosmosFaucetProvider from "./cosmos.provider"
import { FaucetError } from "./faucet-provider.interface"

jest.mock("axios", () => {
  const actual = jest.requireActual<{ default: object; AxiosError: unknown; AxiosHeaders: unknown }>("axios")
  return {
    __esModule: true,
    default: { ...actual.default, post: jest.fn(), get: jest.fn() },
    AxiosError: actual.AxiosError,
    AxiosHeaders: actual.AxiosHeaders
  }
})
const mockedAxios = axios as unknown as { get: jest.Mock }

describe("CosmosFaucetProvider", () => {
  let provider: CosmosFaucetProvider

  beforeEach(() => {
    provider = new CosmosFaucetProvider()
    mockedAxios.get.mockReset()
  })

  it("returns hash + parsed atom amount on success", async () => {
    mockedAxios.get.mockResolvedValue({
      data: { hash: "DEADBEEF", amount: "10000000uatom", status: "success" }
    })
    const result = await provider.request("cosmos1addr")
    expect(result.txHash).toBe("DEADBEEF")
    expect(result.amount).toBe("10") // 10_000_000 uatom = 10 ATOM
  })

  it("non-retryable on 24h rate limit", async () => {
    mockedAxios.get.mockResolvedValue({
      data: { status: "fail", message: "Tokens will only be sent out once every 24 hours" }
    })
    try {
      await provider.request("cosmos1addr")
    } catch (err) {
      const fe = err as FaucetError
      expect(fe.retryable).toBe(false)
      expect(fe.message).toMatch(/24 hours/)
    }
  })

  it("retryable on generic fail status", async () => {
    mockedAxios.get.mockResolvedValue({
      data: { status: "fail", message: "upstream timeout" }
    })
    try {
      await provider.request("cosmos1addr")
    } catch (err) {
      const fe = err as FaucetError
      expect(fe.retryable).toBe(true)
    }
  })

  it("parses non-uatom amount string as-is", async () => {
    mockedAxios.get.mockResolvedValue({
      data: { hash: "X", amount: "weird", status: "success" }
    })
    const result = await provider.request("cosmos1addr")
    expect(result.amount).toBe("weird")
  })
})
