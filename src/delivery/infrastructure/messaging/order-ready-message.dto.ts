import { Type } from 'class-transformer';
import {
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class OrderReadyAddressSnapshotDto {
  @IsString()
  @IsNotEmpty()
  country!: string;

  @IsString()
  @IsNotEmpty()
  street!: string;

  @IsString()
  @IsNotEmpty()
  postal_code!: string;

  @IsString()
  @IsNotEmpty()
  city!: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}

/**
 * Contrat du message `order.ready` publié par le service Commande. Validé
 * strictement : un message qui ne correspond pas à cette forme est rejeté
 * sans requeue (il ne deviendra jamais valide en le rejouant).
 */
export class OrderReadyMessageDto {
  @IsUUID()
  order_id!: string;

  @IsUUID()
  user_id!: string;

  @IsUUID()
  franchise_id!: string;

  @ValidateNested()
  @Type(() => OrderReadyAddressSnapshotDto)
  delivery_address!: OrderReadyAddressSnapshotDto;

  @ValidateNested()
  @Type(() => OrderReadyAddressSnapshotDto)
  pickup_address!: OrderReadyAddressSnapshotDto;

  @IsISO8601()
  ready_at!: string;
}
