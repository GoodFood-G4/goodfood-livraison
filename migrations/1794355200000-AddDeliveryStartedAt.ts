import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Horodatage du passage en `in_transit` (événement delivery.started). Les
 * livraisons déjà en route ou livrées avant cette migration gardent NULL :
 * la date réelle n'a jamais été enregistrée.
 */
export class AddDeliveryStartedAt1794355200000 implements MigrationInterface {
  name = 'AddDeliveryStartedAt1794355200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "deliveries" ADD "started_at" timestamptz`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "deliveries" DROP COLUMN "started_at"`,
    );
  }
}
