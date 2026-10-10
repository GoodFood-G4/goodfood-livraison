import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1767225600000 implements MigrationInterface {
  name = 'InitialSchema1767225600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "addresses" (
        "id" uuid NOT NULL,
        "country" character varying NOT NULL,
        "street" character varying NOT NULL,
        "postal_code" character varying NOT NULL,
        "city" character varying NOT NULL,
        "latitude" double precision NOT NULL,
        "longitude" double precision NOT NULL,
        "created_by" uuid,
        "created_at" timestamptz NOT NULL,
        CONSTRAINT "PK_addresses_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "deliveries" (
        "id" uuid NOT NULL,
        "order_id" uuid NOT NULL,
        "customer_id" uuid,
        "franchise_id" uuid,
        "destination_address_id" uuid NOT NULL,
        "pickup_address_id" uuid,
        "status" character varying NOT NULL,
        "courier_id" uuid,
        "courier_latitude" double precision,
        "courier_longitude" double precision,
        "location_updated_at" timestamptz,
        "accepted_at" timestamptz,
        "picked_up_at" timestamptz,
        "delivered_at" timestamptz,
        "created_at" timestamptz NOT NULL,
        "updated_at" timestamptz NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        CONSTRAINT "PK_deliveries_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_deliveries_order_id" UNIQUE ("order_id"),
        CONSTRAINT "FK_deliveries_destination_address" FOREIGN KEY ("destination_address_id")
          REFERENCES "addresses" ("id"),
        CONSTRAINT "FK_deliveries_pickup_address" FOREIGN KEY ("pickup_address_id")
          REFERENCES "addresses" ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_deliveries_status" ON "deliveries" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_deliveries_courier_id" ON "deliveries" ("courier_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "deliveries"`);
    await queryRunner.query(`DROP TABLE "addresses"`);
  }
}
