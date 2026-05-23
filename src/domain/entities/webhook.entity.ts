import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn
} from "typeorm"
import DeviceEntity from "./device.entity"
import WebhookLogEntity from "./webhook-log.entity"

@Entity("webhooks")
@Index("idx_webhooks_device", ["device_id"])
@Index("idx_webhooks_chain_contract", ["chain", "contract_address"])
class WebhookEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "uuid", nullable: true })
  device_id: string | null

  @ManyToOne(() => DeviceEntity, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "device_id" })
  device: DeviceEntity | null

  @Column({ type: "varchar", length: 30 })
  chain: string

  @Column({ type: "varchar", length: 100 })
  contract_address: string

  @Column({ type: "varchar", length: 200 })
  event_signature: string

  @Column({ type: "boolean", default: true })
  is_active: boolean

  @Column({ type: "timestamptz" })
  expires_at: Date

  @CreateDateColumn({ type: "timestamptz" })
  created_at: Date

  @OneToMany(() => WebhookLogEntity, log => log.webhook)
  logs: WebhookLogEntity[]
}

export default WebhookEntity
