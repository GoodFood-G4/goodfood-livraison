import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ConflictError,
  DomainError,
  ForbiddenError,
  NotFoundError,
  UnprocessableError,
} from '../../domain/domain-error';

/**
 * Traduit les erreurs métier en réponses HTTP. Les contrôleurs n'ont donc aucun
 * try/catch métier : ils laissent remonter les erreurs du domaine.
 */
@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const statusCode = this.statusFor(exception);

    response.status(statusCode).json({
      statusCode,
      error: exception.name,
      message: exception.message,
    });
  }

  private statusFor(exception: DomainError): number {
    if (exception instanceof NotFoundError) {
      return HttpStatus.NOT_FOUND;
    }
    if (exception instanceof ConflictError) {
      return HttpStatus.CONFLICT;
    }
    if (exception instanceof ForbiddenError) {
      return HttpStatus.FORBIDDEN;
    }
    if (exception instanceof UnprocessableError) {
      return HttpStatus.UNPROCESSABLE_ENTITY;
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }
}
