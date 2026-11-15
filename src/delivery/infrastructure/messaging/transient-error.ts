import { QueryFailedError } from 'typeorm';

/** Codes réseau Node.js signalant une dépendance momentanément injoignable. */
const TRANSIENT_NETWORK_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ECONNABORTED',
  'ETIMEDOUT',
  'EPIPE',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ENOTFOUND',
  'EAI_AGAIN',
]);

/**
 * SQLSTATE PostgreSQL transitoires : classe 08 (connexion), arrêt/démarrage du
 * serveur, saturation, conflits de concurrence. 23505 (unicité) en fait partie :
 * deux order.ready concurrents pour la même commande, le rejeu sera acquitté
 * par le contrôle d'idempotence.
 */
const TRANSIENT_SQLSTATE_PREFIXES = ['08'];
const TRANSIENT_SQLSTATES = new Set([
  '57P01', // admin_shutdown
  '57P02', // crash_shutdown
  '57P03', // cannot_connect_now
  '53300', // too_many_connections
  '40001', // serialization_failure
  '40P01', // deadlock_detected
  '23505', // unique_violation (course entre deux messages)
]);

/** Erreurs TypeORM levées quand la DataSource n'a pas (ou plus) de connexion. */
const TRANSIENT_TYPEORM_ERROR_NAMES = new Set([
  'ConnectionIsNotSetError',
  'CannotExecuteNotConnectedError',
]);

/** Messages du driver `pg` sans code (connexion coupée, pool saturé). */
const TRANSIENT_MESSAGE_PATTERNS = [
  /connection terminated/i,
  /timeout exceeded when trying to connect/i,
  /connection timeout/i,
  /client has encountered a connection error/i,
];

interface ErrorWithCode {
  code?: unknown;
  cause?: unknown;
  driverError?: unknown;
}

function codeOf(error: unknown): string | null {
  const code = (error as ErrorWithCode | null)?.code;
  return typeof code === 'string' ? code : null;
}

function isTransientCode(code: string | null): boolean {
  if (!code) {
    return false;
  }
  return (
    TRANSIENT_NETWORK_CODES.has(code) ||
    TRANSIENT_SQLSTATES.has(code) ||
    TRANSIENT_SQLSTATE_PREFIXES.some((prefix) => code.startsWith(prefix))
  );
}

/**
 * Liste blanche : seules les erreurs d'infrastructure connues comme
 * transitoires (base indisponible, connexion perdue, timeout…) justifient une
 * remise en file. Tout le reste (TypeError, bug, donnée inattendue) est
 * considéré comme définitif.
 */
export function isTransientInfrastructureError(
  error: unknown,
  depth = 0,
): boolean {
  if (!(error instanceof Error) || depth > 3) {
    return false;
  }

  if (TRANSIENT_TYPEORM_ERROR_NAMES.has(error.name)) {
    return true;
  }
  if (isTransientCode(codeOf(error))) {
    return true;
  }
  if (
    error instanceof QueryFailedError &&
    isTransientCode(codeOf(error.driverError))
  ) {
    return true;
  }
  if (
    TRANSIENT_MESSAGE_PATTERNS.some((pattern) => pattern.test(error.message))
  ) {
    return true;
  }

  // AggregateError (plusieurs tentatives de connexion) et erreurs enveloppées.
  const nested: unknown[] = [
    (error as ErrorWithCode).cause,
    ...(error instanceof AggregateError ? error.errors : []),
  ];
  return nested.some((inner) =>
    isTransientInfrastructureError(inner, depth + 1),
  );
}
