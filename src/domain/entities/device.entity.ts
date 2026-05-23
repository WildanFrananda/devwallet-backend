import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm"

@Entity("devices")
class DeviceEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "varchar", length: 64, unique: true })
  fingerprint: string

  @Column({ type: "varchar", length: 10 })
  platform: "ios" | "android"

  @Column({ type: "text", nullable: true })
  push_token: string | null

  @CreateDateColumn({ type: "timestamptz" })
  created_at: Date

  @UpdateDateColumn({ type: "timestamptz" })
  last_seen_at: Date
}

export default DeviceEntity
