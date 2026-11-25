/**
 * Format de date unique du service (réponses HTTP et événements goodfood.events) :
 * ISO 8601, UTC, à la seconde, terminé par Z. Ex. 2026-11-11T21:55:25Z.
 */
export function toUtcIsoSeconds(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export function toUtcIsoSecondsOrNull(date: Date | null): string | null {
  return date ? toUtcIsoSeconds(date) : null;
}
