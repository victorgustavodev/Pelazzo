import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { bearer } from 'better-auth/plugins';
import { APIError } from 'better-auth/api';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../shared/database/prisma.service.js';
import type {
  AuthGateway,
  SessionGrant,
} from '../domain/repositories/auth.gateway.js';
import { BusinessError } from '../../../shared/domain/errors.js';
export class BetterAuthGateway implements AuthGateway {
  private readonly auth;
  constructor(prisma: PrismaService, config: ConfigService) {
    this.auth = betterAuth({
      database: prismaAdapter(prisma, { provider: 'postgresql' }),
      secret: config.getOrThrow<string>('AUTH_SECRET'),
      baseURL: config.getOrThrow<string>('AUTH_BASE_URL'),
      basePath: '/api/auth',
      trustedOrigins: [config.getOrThrow<string>('FRONTEND_ORIGIN')],
      emailAndPassword: {
        enabled: true,
        minPasswordLength: 12,
        maxPasswordLength: 128,
      },
      user: { fields: { name: 'displayName' } },
      session: {
        expiresIn: 7 * 86400,
        updateAge: 86400,
        cookieCache: { enabled: false },
      },
      advanced: { database: { generateId: () => randomUUID() } },
      plugins: [bearer()],
      logger: { disabled: true },
    });
  }
  private async invoke<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof APIError) {
        if (error.statusCode === 401)
          throw new BusinessError(
            'UNAUTHENTICATED',
            'Credenciais inválidas ou sessão expirada.',
          );
        if (String(error.body?.code).includes('ALREADY_EXISTS'))
          throw new BusinessError('CONFLICT', 'E-mail já cadastrado.');
        if (error.statusCode >= 400 && error.statusCode < 500)
          throw new BusinessError(
            'INVALID',
            'Dados de autenticação inválidos.',
          );
      }
      throw error;
    }
  }
  async register(input: {
    displayName: string;
    email: string;
    password: string;
  }): Promise<SessionGrant> {
    return this.invoke(async () => {
      const result = await this.auth.api.signUpEmail({
        body: {
          name: input.displayName,
          email: input.email,
          password: input.password,
        },
      });
      if (!result.token)
        throw new BusinessError('UNAUTHENTICATED', 'Sessão não criada.');
      return {
        token: result.token,
        user: {
          id: result.user.id,
          email: result.user.email,
          displayName: result.user.name,
        },
      };
    });
  }
  async login(input: {
    email: string;
    password: string;
  }): Promise<SessionGrant> {
    return this.invoke(async () => {
      const result = await this.auth.api.signInEmail({ body: input });
      return {
        token: result.token,
        user: {
          id: result.user.id,
          email: result.user.email,
          displayName: result.user.name,
        },
      };
    });
  }
  async authenticate(token: string) {
    const result = await this.invoke(() =>
      this.auth.api.getSession({
        headers: new Headers({ authorization: `Bearer ${token}` }),
      }),
    );
    return result
      ? {
          id: result.user.id,
          displayName: result.user.name,
          email: result.user.email,
        }
      : null;
  }
  async logout(token: string) {
    await this.invoke(() =>
      this.auth.api.signOut({
        headers: new Headers({ authorization: `Bearer ${token}` }),
      }),
    );
  }
  async changePassword(
    token: string,
    input: { currentPassword: string; newPassword: string },
  ) {
    await this.invoke(() =>
      this.auth.api.changePassword({
        headers: new Headers({ authorization: `Bearer ${token}` }),
        body: { ...input, revokeOtherSessions: true },
      }),
    );
  }
}
