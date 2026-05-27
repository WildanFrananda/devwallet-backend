import { MigrationInterface, QueryRunner } from "typeorm"

class Init1779540632853 implements MigrationInterface {
  name = "Init1779540632853"

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "devices" (
        "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "fingerprint"  varchar(64) UNIQUE NOT NULL,
        "platform"     varchar(10) NOT NULL,
        "push_token"   text,
        "created_at"   timestamptz NOT NULL DEFAULT now(),
        "last_seen_at" timestamptz NOT NULL DEFAULT now()
      )
    `)

    await queryRunner.query(`
      CREATE TABLE "faucet_requests" (
        "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "device_id"    uuid REFERENCES "devices"("id") ON DELETE SET NULL,
        "chain"        varchar(30) NOT NULL,
        "address"      varchar(100) NOT NULL,
        "status"       varchar(20) NOT NULL DEFAULT 'pending',
        "tx_hash"      varchar(100),
        "amount"       decimal(20, 8),
        "error_msg"    text,
        "created_at"   timestamptz NOT NULL DEFAULT now(),
        "completed_at" timestamptz
      )
    `)
    await queryRunner.query(`CREATE INDEX "idx_faucet_requests_device" ON "faucet_requests" ("device_id")`)
    await queryRunner.query(`CREATE INDEX "idx_faucet_requests_chain" ON "faucet_requests" ("chain")`)
    await queryRunner.query(`CREATE INDEX "idx_faucet_requests_status" ON "faucet_requests" ("status")`)

    await queryRunner.query(`
      CREATE TABLE "webhooks" (
        "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "device_id"        uuid REFERENCES "devices"("id") ON DELETE CASCADE,
        "chain"            varchar(30) NOT NULL,
        "contract_address" varchar(100) NOT NULL,
        "event_signature"  varchar(200) NOT NULL,
        "is_active"        boolean NOT NULL DEFAULT true,
        "expires_at"       timestamptz NOT NULL,
        "created_at"       timestamptz NOT NULL DEFAULT now()
      )
    `)
    await queryRunner.query(`CREATE INDEX "idx_webhooks_device" ON "webhooks" ("device_id")`)
    await queryRunner.query(`CREATE INDEX "idx_webhooks_chain_contract" ON "webhooks" ("chain", "contract_address")`)
    await queryRunner.query(`CREATE INDEX "idx_webhooks_active" ON "webhooks" ("is_active") WHERE "is_active" = true`)

    await queryRunner.query(`
      CREATE TABLE "webhook_logs" (
        "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "webhook_id" uuid REFERENCES "webhooks"("id") ON DELETE CASCADE,
        "payload"    jsonb NOT NULL,
        "delivered"  boolean NOT NULL DEFAULT false,
        "attempts"   integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `)
    await queryRunner.query(`CREATE INDEX "idx_webhook_logs_webhook" ON "webhook_logs" ("webhook_id")`)
    await queryRunner.query(
      `CREATE INDEX "idx_webhook_logs_undelivered" ON "webhook_logs" ("delivered") WHERE "delivered" = false`
    )

    await queryRunner.query(`
      CREATE TABLE "network_configs" (
        "chain_id"     varchar(30) PRIMARY KEY,
        "name"         varchar(50) NOT NULL,
        "rpc_url"      text NOT NULL,
        "explorer_url" text,
        "faucet_url"   text,
        "is_active"    boolean NOT NULL DEFAULT true
      )
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "network_configs"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "webhook_logs"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "webhooks"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "faucet_requests"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "devices"`)
  }
}

export { Init1779540632853 }
