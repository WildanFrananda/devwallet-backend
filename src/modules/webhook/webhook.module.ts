import { Module } from "@nestjs/common"
import WebhookGateway from "./webhook.gateway"

@Module({
  providers: [WebhookGateway]
})
export class WebhookModule {}
