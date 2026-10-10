import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateAddressDto {
  @ApiProperty({ example: 'France' })
  @IsString()
  @IsNotEmpty()
  country!: string;

  @ApiProperty({ example: '2 Rue de Paris' })
  @IsString()
  @IsNotEmpty()
  street!: string;

  @ApiProperty({ example: '76600' })
  @IsString()
  @IsNotEmpty()
  postal_code!: string;

  @ApiProperty({ example: 'Le Havre' })
  @IsString()
  @IsNotEmpty()
  city!: string;

  @ApiPropertyOptional({ example: 49.4938 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ example: 0.1077 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;
}
