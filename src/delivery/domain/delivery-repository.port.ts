import { GeoPoint } from '../../shared/domain/geo-point';
import { Paginated } from '../../shared/application/paginated';
import { Delivery } from './delivery';

export const DELIVERY_REPOSITORY = Symbol('DELIVERY_REPOSITORY');

export interface AvailableDeliveryResult {
  readonly delivery: Delivery;
  readonly distanceKm: number;
}

export interface DeliveryRepository {
  save(delivery: Delivery): Promise<void>;
  findById(id: string): Promise<Delivery | null>;
  findByOrderId(orderId: string): Promise<Delivery | null>;
  countActiveForCourier(courierId: string): Promise<number>;

  /**
   * Uniquement les livraisons `pending`, triées par distance_km croissante.
   * Calculé en SQL (Haversine + pré-filtre bounding box), pas en mémoire.
   */
  findAvailableWithinRadius(
    center: GeoPoint,
    radiusKm: number,
  ): Promise<AvailableDeliveryResult[]>;

  findHistoryForCourier(
    courierId: string,
    page: number,
    limit: number,
  ): Promise<Paginated<Delivery>>;

  /** Livraisons dont `customer_id` est ce client, plus récentes en premier. */
  findForCustomer(
    customerId: string,
    page: number,
    limit: number,
  ): Promise<Paginated<Delivery>>;
}
