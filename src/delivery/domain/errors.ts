import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../shared/domain/domain-error';
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

export class NotAssignedCourierError extends ForbiddenError {
  constructor() {
    super(
      'Seul le livreur assigné à cette livraison peut effectuer cette action',
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

export class NotDeliveryViewerError extends ForbiddenError {
  constructor() {
    super('Vous ne pouvez pas consulter cette livraison');
  }
}
