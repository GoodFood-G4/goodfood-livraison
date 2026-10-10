export const CLOCK = Symbol('CLOCK');

/**
 * Port d'horloge : permet aux use cases de rester déterministes et testables
 * sans dépendre de `Date.now()` directement.
 */
export interface Clock {
  now(): Date;
}
