import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { DeliveryStatus } from '../../domain/delivery-status';

const ALLOWED_STATUSES = [
  DeliveryStatus.PICKED_UP,
  DeliveryStatus.IN_TRANSIT,
  DeliveryStatus.DELIVERED,
];

export class UpdateStatusDto {
  @ApiProperty({ enum: ALLOWED_STATUSES, example: DeliveryStatus.PICKED_UP })
  @IsIn(ALLOWED_STATUSES)
  status!: DeliveryStatus;
}
