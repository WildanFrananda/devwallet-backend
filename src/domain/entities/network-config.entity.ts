import { Column, Entity, PrimaryColumn } from "typeorm"

@Entity("network_configs")
class NetworkConfigEntity {
  @PrimaryColumn({ type: "varchar", length: 30 })
  chain_id: string

  @Column({ type: "varchar", length: 50 })
  name: string

  @Column({ type: "text" })
  rpc_url: string

  @Column({ type: "text", nullable: true })
  explorer_url: string | null

  @Column({ type: "text", nullable: true })
  faucet_url: string | null

  @Column({ type: "boolean", default: true })
  is_active: boolean
}

export default NetworkConfigEntity
