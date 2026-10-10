import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { Actor, Role } from '../../application/actor';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

export interface AuthenticatedRequest extends Request {
  actor: Actor;
}

interface JwtPayload {
  sub?: string;
  role?: number;
}

/**
 * Seul endroit du service qui connaît la forme du JWT émis par le service Auth
 * (claims `sub` et `role`). Toute évolution de ce contrat se change ici uniquement.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers['authorization'];

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token JWT manquant');
    }

    const token = authHeader.slice('Bearer '.length);

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.get<string>('jwtSecret'),
        algorithms: ['HS256'],
      });

      request.actor = this.toActor(payload);
      return true;
    } catch {
      throw new UnauthorizedException('Token JWT invalide');
    }
  }

  private toActor(payload: JwtPayload): Actor {
    if (!payload.sub || !this.isValidRole(payload.role)) {
      throw new UnauthorizedException(
        'Token JWT invalide : claims sub/role manquants ou incorrects',
      );
    }
    return { userId: payload.sub, role: payload.role };
  }

  private isValidRole(role: number | undefined): role is Role {
    return (
      role === Role.CUSTOMER || role === Role.COURIER || role === Role.ADMIN
    );
  }
}
