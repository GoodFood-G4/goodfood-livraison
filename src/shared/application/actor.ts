/**
 * Rôles portés par le claim `role` du JWT émis par le service Auth.
 */
export enum Role {
  CUSTOMER = 1,
  COURIER = 2,
  ADMIN = 3,
}

/**
 * Représente l'utilisateur authentifié côté métier, indépendamment de HTTP.
 * Les use cases ne reçoivent jamais de Request : uniquement un Actor.
 */
export interface Actor {
  readonly userId: string;
  readonly role: Role;
}
