import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnvironment } from './shared/config/environment.js';
import { HealthModule } from './modules/health/health.module.js';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { PersistenceModule } from './shared/infrastructure/persistence.module.js';
import { ErrorFilter } from './shared/presentation/error.filter.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { GroupsModule } from './modules/groups/groups.module.js';
import { ParticipantsModule } from './modules/participants/participants.module.js';
import { MatchesModule } from './modules/matches/matches.module.js';
import { FinanceModule } from './modules/finance/finance.module.js';
import { TeamDrawModule } from './modules/team-draw/team-draw.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        { ttl: 60000, limit: config.get<number>('THROTTLE_LIMIT') ?? 120 },
      ],
    }),
    PersistenceModule,
    AuthModule,
    GroupsModule,
    ParticipantsModule,
    MatchesModule,
    FinanceModule,
    TeamDrawModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: ErrorFilter },
  ],
})
export class AppModule {}
