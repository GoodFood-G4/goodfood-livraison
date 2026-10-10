/**
 * Crée 3 livraisons `pending` autour du Havre en appelant l'API locale, pour
 * démontrer l'application mobile sans dépendre de Commande/RabbitMQ.
 *
 * Usage : npm run script:seed-demo
 */
import 'dotenv/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';

const BASE_URL = `http://localhost:${process.env.PORT ?? '3003'}`;

const DEMO_SPOTS: Array<{
  pickup: [number, number];
  destination: [number, number];
}> = [
  { pickup: [49.4938, 0.1077], destination: [49.4944, 0.1079] },
  { pickup: [49.4925, 0.1113], destination: [49.49, 0.108] },
  { pickup: [49.4953, 0.1032], destination: [49.498, 0.105] },
];

function adminToken(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET manquant dans .env');
  }
  const jwtService = new JwtService({ secret });
  return jwtService.sign(
    { sub: randomUUID(), role: 3 },
    { algorithm: 'HS256' },
  );
}

async function createAddress(
  token: string,
  label: string,
  [latitude, longitude]: [number, number],
): Promise<string> {
  const response = await fetch(`${BASE_URL}/addresses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      country: 'France',
      street: label,
      postal_code: '76600',
      city: 'Le Havre',
      latitude,
      longitude,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Échec de création d'adresse (${response.status}): ${await response.text()}`,
    );
  }

  const body = (await response.json()) as { id: string };
  return body.id;
}

async function createDelivery(
  token: string,
  orderId: string,
  addressId: string,
  pickupAddressId: string,
): Promise<void> {
  const response = await fetch(`${BASE_URL}/deliveries`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      order_id: orderId,
      address_id: addressId,
      pickup_address_id: pickupAddressId,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Échec de création de livraison (${response.status}): ${await response.text()}`,
    );
  }
}

async function main(): Promise<void> {
  const token = adminToken();

  for (const [index, spot] of DEMO_SPOTS.entries()) {
    const pickupId = await createAddress(
      token,
      `Restaurant démo ${index + 1}`,
      spot.pickup,
    );
    const destinationId = await createAddress(
      token,
      `Client démo ${index + 1}`,
      spot.destination,
    );
    const orderId = randomUUID();

    await createDelivery(token, orderId, destinationId, pickupId);
    console.log(`Livraison démo ${index + 1} créée (order_id=${orderId})`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
