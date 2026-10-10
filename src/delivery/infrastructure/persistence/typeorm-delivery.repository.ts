import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GeoPoint } from '../../../shared/domain/geo-point';
import { Paginated } from '../../../shared/application/paginated';
import { Delivery } from '../../domain/delivery';
import {
  ACTIVE_DELIVERY_STATUSES,
  DeliveryStatus,
} from '../../domain/delivery-status';
import {
  AvailableDeliveryResult,
  DeliveryRepository,
} from '../../domain/delivery-repository.port';
import { DeliveryAlreadyAssignedError } from '../../domain/errors';
import { DeliveryOrmEntity } from './delivery.orm-entity';
import { DeliveryMapper, RawDeliveryRow } from './delivery.mapper';

const KM_PER_DEGREE_LATITUDE = 111;

@Injectable()
export class TypeOrmDeliveryRepository implements DeliveryRepository {
  constructor(
    @InjectRepository(DeliveryOrmEntity)
    private readonly repository: Repository<DeliveryOrmEntity>,
  ) {}

  /**
   * Verrou optimiste géré explicitement (plutôt que via le save() de TypeORM) :
   * une mise à jour dont la clause WHERE version=... ne touche aucune ligne
   * signifie qu'une autre acceptation est passée entre-temps.
   */
  async save(delivery: Delivery): Promise<void> {
    const entity = DeliveryMapper.toOrm(delivery);

    const updateResult = await this.repository
      .createQueryBuilder()
      .update(DeliveryOrmEntity)
      .set({
        status: entity.status,
        courierId: entity.courierId,
        courierLatitude: entity.courierLatitude,
        courierLongitude: entity.courierLongitude,
        locationUpdatedAt: entity.locationUpdatedAt,
        acceptedAt: entity.acceptedAt,
        pickedUpAt: entity.pickedUpAt,
        deliveredAt: entity.deliveredAt,
        updatedAt: entity.updatedAt,
        version: delivery.version + 1,
      })
      .where('id = :id AND version = :expectedVersion', {
        id: delivery.id,
        expectedVersion: delivery.version,
      })
      .execute();

    if (updateResult.affected && updateResult.affected > 0) {
      return;
    }

    const alreadyExists = await this.repository.exist({
      where: { id: delivery.id },
    });
    if (alreadyExists) {
      throw new DeliveryAlreadyAssignedError(delivery.id);
    }

    await this.repository.insert(entity);
  }

  async findById(id: string): Promise<Delivery | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? DeliveryMapper.toDomain(entity) : null;
  }

  async findByOrderId(orderId: string): Promise<Delivery | null> {
    const entity = await this.repository.findOne({ where: { orderId } });
    return entity ? DeliveryMapper.toDomain(entity) : null;
  }

  async countActiveForCourier(courierId: string): Promise<number> {
    return this.repository
      .createQueryBuilder('delivery')
      .where('delivery.courier_id = :courierId', { courierId })
      .andWhere('delivery.status IN (:...statuses)', {
        statuses: ACTIVE_DELIVERY_STATUSES,
      })
      .getCount();
  }

  async findAvailableWithinRadius(
    center: GeoPoint,
    radiusKm: number,
  ): Promise<AvailableDeliveryResult[]> {
    const latDelta = radiusKm / KM_PER_DEGREE_LATITUDE;
    const cosLat = Math.max(
      Math.cos((center.latitude * Math.PI) / 180),
      0.000001,
    );
    const lonDelta = radiusKm / (KM_PER_DEGREE_LATITUDE * cosLat);

    const distanceExpression = `
      6371 * acos(
        LEAST(1, GREATEST(-1,
          cos(radians($1)) * cos(radians(a.latitude)) * cos(radians(a.longitude) - radians($2))
          + sin(radians($1)) * sin(radians(a.latitude))
        ))
      )
    `;

    const rows: Array<RawDeliveryRow & { distance_km: string }> =
      await this.repository.manager.query(
        `
        SELECT d.*, ${distanceExpression} AS distance_km
        FROM deliveries d
        JOIN addresses a ON a.id = COALESCE(d.pickup_address_id, d.destination_address_id)
        WHERE d.status = $5
          AND a.latitude BETWEEN $1 - $3 AND $1 + $3
          AND a.longitude BETWEEN $2 - $4 AND $2 + $4
          AND ${distanceExpression} <= $6
        ORDER BY distance_km ASC
        `,
        [
          center.latitude,
          center.longitude,
          latDelta,
          lonDelta,
          DeliveryStatus.PENDING,
          radiusKm,
        ],
      );

    return rows.map((row) => ({
      delivery: DeliveryMapper.fromRawRow(row),
      distanceKm: parseFloat(row.distance_km),
    }));
  }

  async findHistoryForCourier(
    courierId: string,
    page: number,
    limit: number,
  ): Promise<Paginated<Delivery>> {
    const [entities, total] = await this.repository.findAndCount({
      where: { courierId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: entities.map((entity) => DeliveryMapper.toDomain(entity)),
      meta: { page, limit, total },
    };
  }
}
