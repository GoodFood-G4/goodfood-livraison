/**
 * Génère un JWT HS256 de test signé avec JWT_SECRET (.env), pour utiliser
 * Swagger sans que le service Auth ne soit disponible.
 *
 * Usage : npm run script:generate-test-jwt -- --role 2 --sub <uuid> [--expires-in 24h]
 * Le token contient iat et exp (24 h par défaut ; --expires-in accepte un
 * nombre de secondes ou une durée « 30m », « 2h », « 7d »).
 */
import 'dotenv/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';

const DEFAULT_EXPIRES_IN = '24h';

interface Args {
  role: number;
  sub: string;
  expiresInSeconds: number;
}

function parseDuration(value: string): number {
  const match = /^(\d+)([smhd]?)$/.exec(value);
  if (!match) {
    throw new Error(
      '--expires-in doit être un nombre de secondes ou une durée (30m, 2h, 7d)',
    );
  }
  const units: Record<string, number> = {
    '': 1,
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };
  const seconds = Number(match[1]) * units[match[2]];
  if (seconds <= 0) {
    throw new Error('--expires-in doit être strictement positif');
  }
  return seconds;
}

function parseArgs(argv: string[]): Args {
  const args = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) {
      args.set(argv[i].slice(2), argv[i + 1]);
      i += 1;
    }
  }

  const role = Number(args.get('role') ?? '2');
  if (![1, 2, 3].includes(role)) {
    throw new Error('--role doit valoir 1 (client), 2 (livreur) ou 3 (admin)');
  }

  const sub = args.get('sub') ?? randomUUID();

  const expiresInSeconds = parseDuration(
    args.get('expires-in') ?? DEFAULT_EXPIRES_IN,
  );

  return { role, sub, expiresInSeconds };
}

function main(): void {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET manquant dans .env');
  }

  const { role, sub, expiresInSeconds } = parseArgs(process.argv.slice(2));

  const jwtService = new JwtService({ secret });
  // iat est ajouté automatiquement par jsonwebtoken, exp via expiresIn.
  const token = jwtService.sign(
    { sub, role },
    { algorithm: 'HS256', expiresIn: expiresInSeconds },
  );
  const { exp } = jwtService.decode<{ exp: number }>(token);

  console.log(`sub  : ${sub}`);
  console.log(`role : ${role}`);
  console.log(`exp  : ${new Date(exp * 1000).toISOString()}`);
  console.log('');
  console.log(token);
}

main();
