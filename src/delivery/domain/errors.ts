import { ConflictError, NotFoundError } from '../../shared/domain/domain-error';
import { DeliveryStatus } from './delivery-status';

export class DeliveryNotFoundError extends NotFoundError {
  constructor(deliveryId: string) {
    super(`Livraison introuvable : ${deliveryId}`);
  }
}

export class DuplicateOrderError extends ConflictError {
  constructor(orderId: string) {
    super(`Une livraison existe déjà pour la commande ${orderId}`);
  }
}

export class DeliveryAlreadyAssignedError extends ConflictError {
  constructor(deliveryId: string) {
    super(`La livraison ${deliveryId} est déjà assignée à un livreur`);
  }
}

export class InvalidStatusTransitionError extends ConflictError {
  constructor(from: DeliveryStatus, to: DeliveryStatus) {
    super(`Transition de statut invalide : ${from} -> ${to}`);
  }
}

/**
 * Mise à jour de position hors des statuts actifs. Distincte des erreurs de
 * transition : le statut ne change pas, c'est la position qui est refusée.
 */
export class LocationUpdateNotAllowedError extends ConflictError {
  constructor(status: DeliveryStatus) {
    super(
      status === DeliveryStatus.DELIVERED
        ? 'La position ne peut plus être mise à jour : la livraison est terminée'
        : `La position ne peut pas être mise à jour : la livraison n'est pas en cours (statut ${status})`,
    );
  }
}

export class CourierBusyError extends ConflictError {
  constructor(maxActiveDeliveries: number) {
    super(
      `Le livreur a déjà atteint sa limite de ${maxActiveDeliveries} livraisons actives`,
    );
  }
}
