import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Actor } from '../../application/actor';
import { AuthenticatedRequest } from '../guards/jwt-auth.guard';

export const CurrentActor = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Actor => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.actor;
  },
);
