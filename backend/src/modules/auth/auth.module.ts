import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DatabaseModule } from '../../shared/database/database.module.js';
import { PrismaService } from '../../shared/database/prisma.service.js';
import {
  AUTH_GATEWAY,
  type AuthGateway,
} from './domain/repositories/auth.gateway.js';
import { BetterAuthGateway } from './infrastructure/better-auth.gateway.js';
import { AuthGuard } from './presentation/auth.guard.js';
import { AuthController } from './presentation/controllers/auth.controller.js';
import {
  RegisterUseCase,
  LoginUseCase,
  LogoutUseCase,
  ChangePasswordUseCase,
} from './application/use-cases/auth.use-cases.js';
@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [
    {
      provide: AUTH_GATEWAY,
      inject: [PrismaService, ConfigService],
      useFactory: (prisma: PrismaService, config: ConfigService) =>
        new BetterAuthGateway(prisma, config),
    },
    ...[
      RegisterUseCase,
      LoginUseCase,
      LogoutUseCase,
      ChangePasswordUseCase,
    ].map((useCase) => ({
      provide: useCase,
      inject: [AUTH_GATEWAY],
      useFactory: (auth: AuthGateway) => new useCase(auth),
    })),
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AuthModule {}
