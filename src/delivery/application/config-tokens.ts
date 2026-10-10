/**
 * Jetons DI pour des réglages métier configurables par variables d'environnement.
 * Les use cases ne dépendent que de ces valeurs, jamais de ConfigService
 * directement : seuls @Injectable()/@Inject() de Nest sont tolérés ici.
 */
export const MAX_ACTIVE_DELIVERIES_PER_COURIER = Symbol(
  'MAX_ACTIVE_DELIVERIES_PER_COURIER',
);
export const AVERAGE_COURIER_SPEED_KMH = Symbol('AVERAGE_COURIER_SPEED_KMH');
export const DEFAULT_SEARCH_RADIUS_KM = Symbol('DEFAULT_SEARCH_RADIUS_KM');
export const MAX_SEARCH_RADIUS_KM = Symbol('MAX_SEARCH_RADIUS_KM');
