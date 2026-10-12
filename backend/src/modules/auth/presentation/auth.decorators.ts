import {
  createParamDecorator,
  SetMetadata,
  type ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { Actor } from '../../../shared/domain/types.js';
export const PUBLIC_ROUTE = 'pelazzo:public';
export const Public = () => SetMetadata(PUBLIC_ROUTE, true);
export interface ActorRequest {
  headers: { authorization?: string };
  actor?: Actor;
}
export const CurrentActor = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Actor => {
    const actor = context.switchToHttp().getRequest<ActorRequest>().actor;
    if (!actor) throw new UnauthorizedException();
    return actor;
  },
);
export function bearerToken(header: string | undefined): string {
  const value = /^Bearer ([^\s]+)$/i.exec(header ?? '');
  if (!value)
    throw new UnauthorizedException('Informe um token Bearer válido.');
  return value[1];
}
