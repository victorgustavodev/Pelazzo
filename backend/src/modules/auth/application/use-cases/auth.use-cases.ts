import type { AuthGateway } from '../../domain/repositories/auth.gateway.js';
import { text } from '../../../../shared/domain/validation.js';
export class RegisterUseCase {
  constructor(private readonly auth: AuthGateway) {}
  execute(input: { displayName: string; email: string; password: string }) {
    return this.auth.register({
      ...input,
      displayName: text(input.displayName, 'Nome'),
      email: input.email.trim().toLowerCase(),
    });
  }
}
export class LoginUseCase {
  constructor(private readonly auth: AuthGateway) {}
  execute(input: { email: string; password: string }) {
    return this.auth.login({
      ...input,
      email: input.email.trim().toLowerCase(),
    });
  }
}
export class LogoutUseCase {
  constructor(private readonly auth: AuthGateway) {}
  execute(token: string) {
    return this.auth.logout(token);
  }
}
export class ChangePasswordUseCase {
  constructor(private readonly auth: AuthGateway) {}
  execute(
    token: string,
    input: { currentPassword: string; newPassword: string },
  ) {
    return this.auth.changePassword(token, input);
  }
}
