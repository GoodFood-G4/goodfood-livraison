/**
 * Publie un message `order.ready` d'exemple sur l'exchange `goodfood.events`,
 * pour tester le consumer de ce service sans que Commande ne soit disponible.
 *
 * Usage : npm run script:publish-order-ready
 */
import 'dotenv/config';
import * as amqplib from 'amqplib';
import { randomUUID } from 'crypto';

const EXCHANGE_NAME = 'goodfood.events';
const QUEUE_NAME = 'livraison.queue';
const ROUTING_KEY = 'order.ready';

async function main(): Promise<void> {
  const url = process.env.RABBITMQ_URL;
  if (!url) {
    throw new Error('RABBITMQ_URL manquant dans .env');
  }

  const connection = await amqplib.connect(url);
  const channel = await connection.createChannel();

  // Binding de confort pour le développement local uniquement : le binding
  // officiel (exchange + queue + routing keys) appartient à goodfood-infra.
  await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, ROUTING_KEY);

  const payload = {
    order_id: randomUUID(),
    user_id: randomUUID(),
    franchise_id: randomUUID(),
    delivery_address: {
      country: 'France',
      street: '2 Rue de Paris',
      postal_code: '76600',
      city: 'Le Havre',
      latitude: 49.4938,
      longitude: 0.1077,
    },
    pickup_address: {
      country: 'France',
      street: '10 Rue du Restaurant',
      postal_code: '76600',
      city: 'Le Havre',
      latitude: 49.49,
      longitude: 0.1,
    },
    ready_at: new Date().toISOString(),
  };

  channel.publish(
    EXCHANGE_NAME,
    ROUTING_KEY,
    Buffer.from(JSON.stringify(payload)),
    {
      persistent: true,
      contentType: 'application/json',
    },
  );

  console.log(`Message order.ready publié : order_id=${payload.order_id}`);

  await channel.close();
  await connection.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
