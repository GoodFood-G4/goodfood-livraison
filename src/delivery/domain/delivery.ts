import { GeoPoint } from '../../shared/domain/geo-point';
import {
  DeliveryStatus,
  isActiveDeliveryStatus,
  nextStatus,
} from './delivery-status';
import {
  DeliveryAlreadyAssignedError,
  InvalidStatusTransitionError,
  NotAssignedCourierError,
} from './errors';

export interface DeliveryProps {
  readonly id: string;
  readonly orderId: string;
  readonly customerId: string | null;
  readonly franchiseId: string | null;
  readonly destinationAddressId: string;
  readonly pickupAddressId: string | null;
  status: DeliveryStatus;
  courierId: string | null;
  courierLocation: GeoPoint | null;
  locationUpdatedAt: Date | null;
  acceptedAt: Date | null;
  pickedUpAt: Date | null;
  deliveredAt: Date | null;
  readonly createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface NewDeliveryProps {
  readonly id: string;
  readonly orderId: string;
  readonly customerId: string | null;
  readonly franchiseId: string | null;
  readonly destinationAddressId: string;
  readonly pickupAddressId: string | null;
  readonly createdAt: Date;
}

/**
 * Agrégat racine : porte toutes les règles de cycle de vie d'une livraison
 * (acceptation, transitions de statut, position GPS). Les use cases ne font
 * qu'orchestrer ports + entité, jamais les règles elles-mêmes.
 */
export class Delivery {
  private constructor(private readonly props: DeliveryProps) {}

  static create(props: NewDeliveryProps): Delivery {
    return new Delivery({
      ...props,
      status: DeliveryStatus.PENDING,
      courierId: null,
      courierLocation: null,
      locationUpdatedAt: null,
      acceptedAt: null,
      pickedUpAt: null,
      deliveredAt: null,
      updatedAt: props.createdAt,
      version: 1,
    });
  }

  static reconstitute(props: DeliveryProps): Delivery {
    return new Delivery(props);
  }

  get id(): string {
    return this.props.id;
  }

  get orderId(): string {
    return this.props.orderId;
  }

  get customerId(): string | null {
    return this.props.customerId;
  }

  get franchiseId(): string | null {
    return this.props.franchiseId;
  }

  get destinationAddressId(): string {
    return this.props.destinationAddressId;
  }

  get pickupAddressId(): string | null {
    return this.props.pickupAddressId;
  }

  get status(): DeliveryStatus {
    return this.props.status;
  }

  get courierId(): string | null {
    return this.props.courierId;
  }

  get courierLocation(): GeoPoint | null {
    return this.props.courierLocation;
  }

  get locationUpdatedAt(): Date | null {
    return this.props.locationUpdatedAt;
  }

  get acceptedAt(): Date | null {
    return this.props.acceptedAt;
  }

  get pickedUpAt(): Date | null {
    return this.props.pickedUpAt;
  }

  get deliveredAt(): Date | null {
    return this.props.deliveredAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get version(): number {
    return this.props.version;
  }

  isActive(): boolean {
    return isActiveDeliveryStatus(this.props.status);
  }

  isTerminated(): boolean {
    return this.props.status === DeliveryStatus.DELIVERED;
  }

  /**
   * Seule porte d'entrée depuis `pending`. La course simultanée (deux livreurs
   * acceptent en même temps) est tranchée par le verrou optimiste en persistance :
   * ici on ne garde que la règle "une seule fois, depuis pending".
   */
  accept(courierId: string, occurredAt: Date): void {
    if (this.props.status !== DeliveryStatus.PENDING) {
      throw new DeliveryAlreadyAssignedError(this.props.id);
    }
    this.props.courierId = courierId;
    this.props.status = DeliveryStatus.ASSIGNED;
    this.props.acceptedAt = occurredAt;
    this.props.updatedAt = occurredAt;
  }

  advanceTo(
    targetStatus: DeliveryStatus,
    courierId: string,
    occurredAt: Date,
  ): void {
    this.assertAssignedCourier(courierId);

    const expected = nextStatus(this.props.status);
    if (!expected || expected !== targetStatus) {
      throw new InvalidStatusTransitionError(this.props.status, targetStatus);
    }

    this.props.status = targetStatus;
    if (targetStatus === DeliveryStatus.PICKED_UP) {
      this.props.pickedUpAt = occurredAt;
    }
    if (targetStatus === DeliveryStatus.DELIVERED) {
      this.props.deliveredAt = occurredAt;
    }
    this.props.updatedAt = occurredAt;
  }

  updateLocation(
    courierId: string,
    location: GeoPoint,
    occurredAt: Date,
  ): void {
    this.assertAssignedCourier(courierId);

    if (!this.isActive()) {
      throw new InvalidStatusTransitionError(
        this.props.status,
        this.props.status,
      );
    }

    this.props.courierLocation = location;
    this.props.locationUpdatedAt = occurredAt;
    this.props.updatedAt = occurredAt;
  }

  private assertAssignedCourier(courierId: string): void {
    if (this.props.courierId !== courierId) {
      throw new NotAssignedCourierError();
    }
  }
}
