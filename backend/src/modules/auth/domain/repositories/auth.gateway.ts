import type { Actor } from '../../../../shared/domain/types.js';
export interface SessionGrant {
  token: string;
  user: Actor;
}
export interface AuthGateway {
  register(input: {
    displayName: string;
    email: string;
    password: string;
  }): Promise<SessionGrant>;
  login(input: { email: string; password: string }): Promise<SessionGrant>;
  authenticate(token: string): Promise<Actor | null>;
  logout(token: string): Promise<void>;
  changePassword(
    token: string,
    input: { currentPassword: string; newPassword: string },
  ): Promise<void>;
}
export const AUTH_GATEWAY = Symbol('AUTH_GATEWAY');
