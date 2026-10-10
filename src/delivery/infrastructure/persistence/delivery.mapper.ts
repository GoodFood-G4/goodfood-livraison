import { GeoPoint } from '../../../shared/domain/geo-point';
import { Delivery, DeliveryProps } from '../../domain/delivery';
import { DeliveryStatus } from '../../domain/delivery-status';
import { DeliveryOrmEntity } from './delivery.orm-entity';

/**
 * Forme d'une ligne telle que renvoyée par une requête SQL brute (colonnes en
 * snake_case), utilisée pour la recherche par distance qui ne passe pas par le
 * hydrateur d'entité TypeORM.
 */
export interface RawDeliveryRow {
  id: string;
  order_id: string;
  customer_id: string | null;
  franchise_id: string | null;
  destination_address_id: string;
  pickup_address_id: string | null;
  status: string;
  courier_id: string | null;
  courier_latitude: number | string | null;
  courier_longitude: number | string | null;
  location_updated_at: Date | null;
  accepted_at: Date | null;
  picked_up_at: Date | null;
  delivered_at: Date | null;
  created_at: Date;
  updated_at: Date;
  version: number;
}

export class DeliveryMapper {
  static toDomain(entity: DeliveryOrmEntity): Delivery {
    return Delivery.reconstitute(this.buildProps(entity));
  }

  static fromRawRow(row: RawDeliveryRow): Delivery {
    return Delivery.reconstitute(
      this.buildProps({
        ...row,
        orderId: row.order_id,
        customerId: row.customer_id,
        franchiseId: row.franchise_id,
        destinationAddressId: row.destination_address_id,
        pickupAddressId: row.pickup_address_id,
        courierId: row.courier_id,
        courierLatitude:
          row.courier_latitude === null ? null : Number(row.courier_latitude),
        courierLongitude:
          row.courier_longitude === null ? null : Number(row.courier_longitude),
        locationUpdatedAt: row.location_updated_at,
        acceptedAt: row.accepted_at,
        pickedUpAt: row.picked_up_at,
        deliveredAt: row.delivered_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      } as DeliveryOrmEntity),
    );
  }

  private static buildProps(entity: DeliveryOrmEntity): DeliveryProps {
    return {
      id: entity.id,
      orderId: entity.orderId,
      customerId: entity.customerId,
      franchiseId: entity.franchiseId,
      destinationAddressId: entity.destinationAddressId,
      pickupAddressId: entity.pickupAddressId,
      status: entity.status as DeliveryStatus,
      courierId: entity.courierId,
      courierLocation:
        entity.courierLatitude !== null && entity.courierLongitude !== null
          ? GeoPoint.create(entity.courierLatitude, entity.courierLongitude)
          : null,
      locationUpdatedAt: entity.locationUpdatedAt,
      acceptedAt: entity.acceptedAt,
      pickedUpAt: entity.pickedUpAt,
      deliveredAt: entity.deliveredAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      version: entity.version,
    };
  }

  static toOrm(delivery: Delivery): DeliveryOrmEntity {
    const entity = new DeliveryOrmEntity();
    entity.id = delivery.id;
    entity.orderId = delivery.orderId;
    entity.customerId = delivery.customerId;
    entity.franchiseId = delivery.franchiseId;
    entity.destinationAddressId = delivery.destinationAddressId;
    entity.pickupAddressId = delivery.pickupAddressId;
    entity.status = delivery.status;
    entity.courierId = delivery.courierId;
    entity.courierLatitude = delivery.courierLocation?.latitude ?? null;
    entity.courierLongitude = delivery.courierLocation?.longitude ?? null;
    entity.locationUpdatedAt = delivery.locationUpdatedAt;
    entity.acceptedAt = delivery.acceptedAt;
    entity.pickedUpAt = delivery.pickedUpAt;
    entity.deliveredAt = delivery.deliveredAt;
    entity.createdAt = delivery.createdAt;
    entity.updatedAt = delivery.updatedAt;
    entity.version = delivery.version;
    return entity;
  }
}
