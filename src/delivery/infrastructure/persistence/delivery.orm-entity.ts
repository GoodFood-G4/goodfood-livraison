import { Column, Entity, Index, PrimaryColumn, VersionColumn } from 'typeorm';

@Entity({ name: 'deliveries' })
export class DeliveryOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'order_id', type: 'uuid', unique: true })
  orderId!: string;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId!: string | null;

  @Column({ name: 'franchise_id', type: 'uuid', nullable: true })
  franchiseId!: string | null;

  @Column({ name: 'destination_address_id', type: 'uuid' })
  destinationAddressId!: string;

  @Column({ name: 'pickup_address_id', type: 'uuid', nullable: true })
  pickupAddressId!: string | null;

  @Index()
  @Column()
  status!: string;

  @Index()
  @Column({ name: 'courier_id', type: 'uuid', nullable: true })
  courierId!: string | null;

  @Column({
    name: 'courier_latitude',
    type: 'double precision',
    nullable: true,
  })
  courierLatitude!: number | null;

  @Column({
    name: 'courier_longitude',
    type: 'double precision',
    nullable: true,
  })
  courierLongitude!: number | null;

  @Column({ name: 'location_updated_at', type: 'timestamptz', nullable: true })
  locationUpdatedAt!: Date | null;

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
  acceptedAt!: Date | null;

  @Column({ name: 'picked_up_at', type: 'timestamptz', nullable: true })
  pickedUpAt!: Date | null;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt!: Date | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @VersionColumn()
  version!: number;
}
