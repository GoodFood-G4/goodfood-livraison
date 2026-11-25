import { toUtcIsoSeconds, toUtcIsoSecondsOrNull } from './utc-date-format';

describe('utc-date-format', () => {
  it('formate en UTC à la seconde, terminé par Z, sans millisecondes', () => {
    expect(toUtcIsoSeconds(new Date('2026-11-11T23:55:25.785+02:00'))).toBe(
      '2026-11-11T21:55:25Z',
    );
  });

  it('renvoie null pour une date absente', () => {
    expect(toUtcIsoSecondsOrNull(null)).toBeNull();
    expect(toUtcIsoSecondsOrNull(new Date('2026-01-01T00:00:00Z'))).toBe(
      '2026-01-01T00:00:00Z',
    );
  });
});
