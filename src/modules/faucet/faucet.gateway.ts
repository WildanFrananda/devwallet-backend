import { Logger } from "@nestjs/common"
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer
} from "@nestjs/websockets"
import { Server, WebSocket } from "ws"
import type { IncomingMessage } from "http"

type FaucetEvent =
  | {
      type: "faucet.success"
      requestId: string
      chain: string
      address: string
      txHash: string | null
      amount: string
      manualUrl?: string | null
    }
  | {
      type: "faucet.failed"
      requestId: string
      chain: string
      address: string
      error: string
      manualUrl?: string | null
    }
  | {
      type: "faucet.processing"
      requestId: string
      chain: string
      address: string
    }

/**
 * WebSocket gateway for real-time faucet progress. Mobile connects to
 * `wss://host/faucet/ws?fingerprint=<deviceFingerprint>` and receives
 * `faucet.processing | faucet.success | faucet.failed` events scoped to its
 * fingerprint.
 *
 * Auth: Phase 2 uses the device fingerprint header sent in the original
 * REST request — same value the rate-limit guard uses. Future phase can
 * upgrade to JWT.
 */
@WebSocketGateway({ path: "/faucet/ws" })
class FaucetGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(FaucetGateway.name)
  private readonly clients = new Map<string, Set<WebSocket>>()

  public handleConnection(client: WebSocket, req: IncomingMessage): void {
    const fingerprint = FaucetGateway.parseFingerprint(req)
    if (!fingerprint) {
      this.logger.warn("Rejected connection without fingerprint")
      client.close(4001, "missing fingerprint")
      return
    }
    const set = this.clients.get(fingerprint) ?? new Set<WebSocket>()
    set.add(client)
    this.clients.set(fingerprint, set)
    this.logger.log(`Subscribed fingerprint=${fingerprint} (totalClients=${this.server.clients.size})`)
    client.send(JSON.stringify({ type: "subscribed", fingerprint, ts: Date.now() }))
  }

  public handleDisconnect(client: WebSocket): void {
    for (const [fingerprint, set] of this.clients.entries()) {
      if (set.delete(client) && set.size === 0) {
        this.clients.delete(fingerprint)
      }
    }
    this.logger.log(`Client disconnected (totalClients=${this.server.clients.size})`)
  }

  public emit(fingerprint: string, event: FaucetEvent): void {
    const sockets = this.clients.get(fingerprint)
    if (!sockets || sockets.size === 0) return
    const payload = JSON.stringify(event)
    for (const socket of sockets) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(payload)
      }
    }
  }

  private static parseFingerprint(req: IncomingMessage): string | null {
    const url = new URL(req.url ?? "/faucet/ws", "http://localhost")
    const fromQuery = url.searchParams.get("fingerprint")
    if (fromQuery && fromQuery.length >= 8) return fromQuery
    const header = req.headers["x-device-fingerprint"]
    if (typeof header === "string" && header.length >= 8) return header
    return null
  }
}

export default FaucetGateway
export type { FaucetEvent }
