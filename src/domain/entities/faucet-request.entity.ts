import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn
} from "typeorm"
import DeviceEntity from "./device.entity"

type FaucetRequestStatus = "pending" | "processing" | "completed" | "failed"

@Entity("faucet_requests")
@Index("idx_faucet_requests_device", ["device_id"])
@Index("idx_faucet_requests_chain", ["chain"])
@Index("idx_faucet_requests_status", ["status"])
class FaucetRequestEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "uuid", nullable: true })
  device_id: string | null

  @ManyToOne(() => DeviceEntity, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "device_id" })
  device: DeviceEntity | null

  @Column({ type: "varchar", length: 30 })
  chain: string

  @Column({ type: "varchar", length: 100 })
  address: string

  @Column({ type: "varchar", length: 20, default: "pending" })
  status: FaucetRequestStatus

  @Column({ type: "varchar", length: 100, nullable: true })
  tx_hash: string | null

  @Column({ type: "decimal", precision: 20, scale: 8, nullable: true })
  amount: string | null

  @Column({ type: "text", nullable: true })
  error_msg: string | null

  @CreateDateColumn({ type: "timestamptz" })
  created_at: Date

  @Column({ type: "timestamptz", nullable: true })
  completed_at: Date | null
}

export default FaucetRequestEntity
export { type FaucetRequestStatus }