import axios, { AxiosError, AxiosHeaders } from "axios"
import XrplFaucetProvider from "./xrpl.provider"
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
const mockedAxios = axios as unknown as { post: jest.Mock; get: jest.Mock }

describe("XrplFaucetProvider", () => {
  let provider: XrplFaucetProvider

  beforeEach(() => {
    provider = new XrplFaucetProvider()
    mockedAxios.post.mockReset()
  })

  it("returns transactionHash + amount on 200", async () => {
    mockedAxios.post.mockResolvedValue({
      data: { transactionHash: "ABC123", amount: 1000 }
    })
    const result = await provider.request("rDest")
    expect(result.txHash).toBe("ABC123")
    expect(result.amount).toBe("1000")
    expect(result.providerName).toMatch(/xrpl/)
  })

  it("falls back to balance/default when amount missing", async () => {
    mockedAxios.post.mockResolvedValue({ data: { balance: 500 } })
    const result = await provider.request("rDest")
    expect(result.amount).toBe("500")
  })

  it("wraps AxiosError 5xx as retryable FaucetError", async () => {
    const headers = new AxiosHeaders()
    const err = new AxiosError(
      "boom",
      "ERR_BAD_RESPONSE",
      { headers },
      undefined,
      { status: 502, statusText: "Bad Gateway", headers, config: { headers } as never, data: "upstream" }
    )
    mockedAxios.post.mockRejectedValue(err)
    await expect(provider.request("rDest")).rejects.toBeInstanceOf(FaucetError)
    try {
      await provider.request("rDest")
    } catch (e) {
      const fe = e as FaucetError
      expect(fe.retryable).toBe(true)
      expect(fe.message).toMatch(/502/)
    }
  })

  it("wraps AxiosError 4xx as non-retryable", async () => {
    const headers = new AxiosHeaders()
    const err = new AxiosError(
      "bad",
      "ERR_BAD_REQUEST",
      { headers },
      undefined,
      { status: 400, statusText: "Bad", headers, config: { headers } as never, data: "bad addr" }
    )
    mockedAxios.post.mockRejectedValue(err)
    try {
      await provider.request("rDest")
    } catch (e) {
      const fe = e as FaucetError
      expect(fe.retryable).toBe(false)
    }
  })
})
