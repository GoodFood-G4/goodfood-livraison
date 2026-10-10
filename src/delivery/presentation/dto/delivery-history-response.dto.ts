import { ApiProperty } from '@nestjs/swagger';
import { Paginated } from '../../../shared/application/paginated';
import { Delivery } from '../../domain/delivery';
import { DeliveryResponseDto } from './delivery-response.dto';

class PaginationMetaDto {
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
}

export class DeliveryHistoryResponseDto {
  @ApiProperty({ type: [DeliveryResponseDto] })
  data!: DeliveryResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;

  static fromPaginated(
    paginated: Paginated<Delivery>,
  ): DeliveryHistoryResponseDto {
    const dto = new DeliveryHistoryResponseDto();
    dto.data = paginated.data.map((delivery) =>
      DeliveryResponseDto.fromDomain(delivery),
    );
    dto.meta = paginated.meta;
    return dto;
  }
}
