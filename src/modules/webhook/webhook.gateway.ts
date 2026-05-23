import { Logger } from "@nestjs/common"
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from "@nestjs/websockets"
import { Server, WebSocket } from "ws"

@WebSocketGateway({ path: "/ws" })
export class WebhookGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(WebhookGateway.name)

  handleConnection(client: WebSocket): void {
    this.logger.log(`client connected (total=${this.server.clients.size})`)
    client.send(JSON.stringify({ event: "hello", ts: Date.now() }))
  }

  handleDisconnect(): void {
    this.logger.log(`client disconnected (total=${this.server.clients.size})`)
  }

  @SubscribeMessage("ping")
  onPing(@MessageBody() data: unknown, @ConnectedSocket() client: WebSocket): void {
    client.send(JSON.stringify({ event: "pong", echo: data, ts: Date.now() }))
  }
}
