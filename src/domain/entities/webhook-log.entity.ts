import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn
} from "typeorm"
import WebhookEntity from "./webhook.entity"

@Entity("webhook_logs")
@Index("idx_webhook_logs_webhook", ["webhook_id"])
class WebhookLogEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "uuid", nullable: true })
  webhook_id: string | null

  @ManyToOne(() => WebhookEntity, hook => hook.logs, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "webhook_id" })
  webhook: WebhookEntity | null

  @Column({ type: "jsonb" })
  payload: Record<string, unknown>

  @Column({ type: "boolean", default: false })
  delivered: boolean

  @Column({ type: "integer", default: 0 })
  attempts: number

  @CreateDateColumn({ type: "timestamptz" })
  created_at: Date
}

export default WebhookLogEntity
