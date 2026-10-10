import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'addresses' })
export class AddressOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column()
  country!: string;

  @Column()
  street!: string;

  @Column({ name: 'postal_code' })
  postalCode!: string;

  @Column()
  city!: string;

  @Column('double precision')
  latitude!: number;

  @Column('double precision')
  longitude!: number;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
