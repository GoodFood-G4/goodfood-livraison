import { MigrationInterface, QueryRunner } from 'typeorm';

/** Index pour GET /deliveries/mine (livraisons d'un client). */
export class AddDeliveriesCustomerIdIndex1795651200000 implements MigrationInterface {
  name = 'AddDeliveriesCustomerIdIndex1795651200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_deliveries_customer_id" ON "deliveries" ("customer_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_deliveries_customer_id"`);
  }
}
