import { GeoPoint } from '../../shared/domain/geo-point';

export interface AddressProps {
  readonly id: string;
  readonly country: string;
  readonly street: string;
  readonly postalCode: string;
  readonly city: string;
  readonly location: GeoPoint;
  readonly createdBy: string | null;
  readonly createdAt: Date;
}

/**
 * Un snapshot naturel : une adresse ne se modifie jamais, elle est recréée.
 * Elle ne peut jamais exister sans coordonnées (location est obligatoire).
 */
export class Address {
  private constructor(private readonly props: AddressProps) {}

  static create(props: AddressProps): Address {
    return new Address(props);
  }

  get id(): string {
    return this.props.id;
  }

  get country(): string {
    return this.props.country;
  }

  get street(): string {
    return this.props.street;
  }

  get postalCode(): string {
    return this.props.postalCode;
  }

  get city(): string {
    return this.props.city;
  }

  get location(): GeoPoint {
    return this.props.location;
  }

  get createdBy(): string | null {
    return this.props.createdBy;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
