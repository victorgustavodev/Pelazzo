import {
  Injectable,
  Inject,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  AUTH_GATEWAY,
  type AuthGateway,
} from '../domain/repositories/auth.gateway.js';
import {
  PUBLIC_ROUTE,
  bearerToken,
  type ActorRequest,
} from './auth.decorators.js';
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(AUTH_GATEWAY) private readonly auth: AuthGateway,
  ) {}
  async canActivate(context: ExecutionContext) {
    if (
      this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const request = context.switchToHttp().getRequest<ActorRequest>();
    const actor = await this.auth.authenticate(
      bearerToken(request.headers.authorization),
    );
    if (!actor) throw new UnauthorizedException('Sessão inválida ou expirada.');
    request.actor = actor;
    return true;
  }
}
