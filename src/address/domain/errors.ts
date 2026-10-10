import {
  ForbiddenError,
  NotFoundError,
  UnprocessableError,
} from '../../shared/domain/domain-error';

export class AddressNotFoundError extends NotFoundError {
  constructor(addressId: string) {
    super(`Adresse introuvable : ${addressId}`);
  }
}

export class NotAddressOwnerError extends ForbiddenError {
  constructor() {
    super(
      "Seul le créateur de l'adresse ou un administrateur peut la consulter",
    );
  }
}

export class AddressNotGeocodableError extends UnprocessableError {
  constructor() {
    super(
      "Impossible de géocoder cette adresse : aucune coordonnée n'a pu être déterminée",
    );
  }
}
