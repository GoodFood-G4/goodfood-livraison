export enum DeliveryStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
}

/**
 * Statuts pour lesquels une livraison est considérée "active" : elle compte
 * dans la limite MAX_ACTIVE_DELIVERIES_PER_COURIER et accepte une position GPS.
 */
export const ACTIVE_DELIVERY_STATUSES: ReadonlyArray<DeliveryStatus> = [
  DeliveryStatus.ASSIGNED,
  DeliveryStatus.PICKED_UP,
  DeliveryStatus.IN_TRANSIT,
];

export function isActiveDeliveryStatus(status: DeliveryStatus): boolean {
  return ACTIVE_DELIVERY_STATUSES.includes(status);
}

/**
 * Seule transition valide = la suivante dans la chaîne. `pending` n'a pas de
 * suivant ici : il n'est quitté que via `accept`.
 */
const NEXT_STATUS: Record<DeliveryStatus, DeliveryStatus | null> = {
  [DeliveryStatus.PENDING]: null,
  [DeliveryStatus.ASSIGNED]: DeliveryStatus.PICKED_UP,
  [DeliveryStatus.PICKED_UP]: DeliveryStatus.IN_TRANSIT,
  [DeliveryStatus.IN_TRANSIT]: DeliveryStatus.DELIVERED,
  [DeliveryStatus.DELIVERED]: null,
};

export function nextStatus(current: DeliveryStatus): DeliveryStatus | null {
  return NEXT_STATUS[current];
}
