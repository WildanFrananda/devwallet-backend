import FaucetGateway from "./faucet.gateway"

type FakeSocket = {
  readyState: number
  close: jest.Mock
  send: jest.Mock
}

function makeSocket(open = true): FakeSocket {
  return {
    readyState: open ? 1 : 3,
    close: jest.fn(),
    send: jest.fn()
  }
}

function makeReq(url: string): { url: string; headers: Record<string, string> } {
  return { url, headers: {} }
}

describe("FaucetGateway", () => {
  let gateway: FaucetGateway

  beforeEach(() => {
    gateway = new FaucetGateway()
    ;(gateway as unknown as { server: { clients: Set<unknown> } }).server = {
      clients: new Set()
    }
  })

  it("closes connection without fingerprint param", () => {
    const sock = makeSocket()
    gateway.handleConnection(
      sock as never,
      makeReq("/faucet/ws") as never
    )
    expect(sock.close).toHaveBeenCalledWith(4001, "missing fingerprint")
  })

  it("subscribes valid fingerprint and acks", () => {
    const sock = makeSocket()
    gateway.handleConnection(
      sock as never,
      makeReq("/faucet/ws?fingerprint=fp-abcdefgh") as never
    )
    expect(sock.send).toHaveBeenCalledWith(
      expect.stringContaining("\"type\":\"subscribed\"")
    )
  })

  it("emits event to all sockets matching fingerprint", () => {
    const sockA = makeSocket()
    const sockB = makeSocket()
    gateway.handleConnection(sockA as never, makeReq("/faucet/ws?fingerprint=fp-shared1") as never)
    gateway.handleConnection(sockB as never, makeReq("/faucet/ws?fingerprint=fp-shared1") as never)
    sockA.send.mockClear()
    sockB.send.mockClear()

    gateway.emit("fp-shared1", { type: "faucet.processing", requestId: "r", chain: "c", address: "a" })
    expect(sockA.send).toHaveBeenCalled()
    expect(sockB.send).toHaveBeenCalled()
  })

  it("does not emit to other fingerprints", () => {
    const sock = makeSocket()
    gateway.handleConnection(sock as never, makeReq("/faucet/ws?fingerprint=fp-target1") as never)
    sock.send.mockClear()
    gateway.emit("fp-other11", { type: "faucet.processing", requestId: "r", chain: "c", address: "a" })
    expect(sock.send).not.toHaveBeenCalled()
  })

  it("skips closed sockets", () => {
    const sock = makeSocket(false)
    gateway.handleConnection(sock as never, makeReq("/faucet/ws?fingerprint=fp-closed11") as never)
    sock.send.mockClear()
    gateway.emit("fp-closed11", { type: "faucet.failed", requestId: "r", chain: "c", address: "a", error: "x" })
    expect(sock.send).not.toHaveBeenCalled()
  })

  it("removes socket on disconnect", () => {
    const sock = makeSocket()
    gateway.handleConnection(sock as never, makeReq("/faucet/ws?fingerprint=fp-removed1") as never)
    gateway.handleDisconnect(sock as never)
    sock.send.mockClear()
    gateway.emit("fp-removed1", { type: "faucet.processing", requestId: "r", chain: "c", address: "a" })
    expect(sock.send).not.toHaveBeenCalled()
  })
})
