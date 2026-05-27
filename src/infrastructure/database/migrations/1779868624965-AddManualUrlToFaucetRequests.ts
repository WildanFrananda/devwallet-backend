import { MigrationInterface, QueryRunner } from "typeorm"

export class AddManualUrlToFaucetRequests1779868624965 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "faucet_requests" ADD COLUMN "manual_url" text NULL`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "faucet_requests" DROP COLUMN "manual_url"`)
  }
}
