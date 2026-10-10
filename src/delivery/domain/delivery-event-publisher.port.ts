export const DELIVERY_EVENT_PUBLISHER = Symbol('DELIVERY_EVENT_PUBLISHER');

export interface DeliveryEventPayload {
  readonly deliveryId: string;
  readonly orderId: string;
  readonly customerId: string | null;
  readonly courierId: string | null;
  readonly occurredAt: Date;
}

/**
 * Un évènement par transition persistée. Les noms de routing keys AMQP sont un
 * détail d'infrastructure : le domaine/l'application ne connaissent que ces
 * quatre intentions métier.
 *
 * Publication "best effort" : une implémentation ne doit jamais rejeter la
 * promesse pour une indisponibilité de RabbitMQ (cf. use cases, qui ne
 * catch jamais cette erreur).
 */
export interface DeliveryEventPublisher {
  publishAssigned(payload: DeliveryEventPayload): Promise<void>;
  publishPickedUp(payload: DeliveryEventPayload): Promise<void>;
  publishStarted(payload: DeliveryEventPayload): Promise<void>;
  publishCompleted(payload: DeliveryEventPayload): Promise<void>;
}
