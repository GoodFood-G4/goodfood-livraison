/**
 * Noms de routing keys AMQP centralisés dans ce seul fichier (exchange topic
 * durable `goodfood.events`, déclaré par goodfood-infra).
 */
export const EXCHANGE_NAME = 'goodfood.events';
export const QUEUE_NAME = 'livraison.queue';

export const ORDER_READY_ROUTING_KEY = 'order.ready';

export const DELIVERY_ASSIGNED_ROUTING_KEY = 'delivery.assigned';
export const DELIVERY_PICKED_UP_ROUTING_KEY = 'delivery.picked_up';
export const DELIVERY_STARTED_ROUTING_KEY = 'delivery.started';
export const DELIVERY_COMPLETED_ROUTING_KEY = 'delivery.completed';
