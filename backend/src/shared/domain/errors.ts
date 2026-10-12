export type ErrorKind =
  'INVALID' | 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT';
export class BusinessError extends Error {
  constructor(
    public readonly kind: ErrorKind,
    message: string,
  ) {
    super(message);
  }
}
export function invalid(message: string): never {
  throw new BusinessError('INVALID', message);
}
export function conflict(message: string): never {
  throw new BusinessError('CONFLICT', message);
}
export function missing(message = 'Registro não encontrado.'): never {
  throw new BusinessError('NOT_FOUND', message);
}
