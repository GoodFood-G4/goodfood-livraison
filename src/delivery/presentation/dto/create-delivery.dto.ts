import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class CreateDeliveryDto {
  @ApiProperty({ example: '11111111-1111-4111-8111-111111111111' })
  @IsUUID()
  order_id!: string;

  @ApiProperty({
    example: '22222222-2222-4222-8222-222222222222',
    description: "Identifiant de l'adresse de livraison",
  })
  @IsUUID()
  address_id!: string;

  @ApiPropertyOptional({ example: '33333333-3333-4333-8333-333333333333' })
  @IsOptional()
  @IsUUID()
  pickup_address_id?: string;

  @ApiPropertyOptional({ example: '44444444-4444-4444-8444-444444444444' })
  @IsOptional()
  @IsUUID()
  customer_id?: string;

  @ApiPropertyOptional({ example: '55555555-5555-4555-8555-555555555555' })
  @IsOptional()
  @IsUUID()
  franchise_id?: string;
}
