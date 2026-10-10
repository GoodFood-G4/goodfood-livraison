/**
 * Génère un JWT HS256 de test signé avec JWT_SECRET (.env), pour utiliser
 * Swagger sans que le service Auth ne soit disponible.
 *
 * Usage : npm run script:generate-test-jwt -- --role 2 --sub <uuid>
 */
import 'dotenv/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';

function parseArgs(argv: string[]): { role: number; sub: string } {
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

  return { role, sub };
}

function main(): void {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET manquant dans .env');
  }

  const { role, sub } = parseArgs(process.argv.slice(2));

  const jwtService = new JwtService({ secret });
  const token = jwtService.sign({ sub, role }, { algorithm: 'HS256' });

  console.log(`sub  : ${sub}`);
  console.log(`role : ${role}`);
  console.log('');
  console.log(token);
}

main();
