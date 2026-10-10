/**
 * Racine commune des erreurs métier. Chaque sous-classe catégorielle (NotFound,
 * Conflict, Forbidden, Unprocessable) est traduite en code HTTP par le
 * DomainErrorFilter, sans que le domaine n'ait à connaître HTTP.
 */
export abstract class DomainError extends Error {
  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export abstract class NotFoundError extends DomainError {}

export abstract class ConflictError extends DomainError {}

export abstract class ForbiddenError extends DomainError {}

export abstract class UnprocessableError extends DomainError {}
