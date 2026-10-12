import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../shared/database/database.module.js';
import {
  DATABASE_PROBE,
  type DatabaseProbe,
} from './domain/services/database-probe.js';
import { PrismaDatabaseProbe } from './infrastructure/prisma-database-probe.js';
import { CheckReadinessUseCase } from './application/use-cases/check-readiness.use-case.js';
import { HealthController } from './presentation/controllers/health.controller.js';

@Module({
  imports: [DatabaseModule],
  controllers: [HealthController],
  providers: [
    { provide: DATABASE_PROBE, useClass: PrismaDatabaseProbe },
    {
      provide: CheckReadinessUseCase,
      inject: [DATABASE_PROBE],
      useFactory: (database: DatabaseProbe) =>
        new CheckReadinessUseCase(database),
    },
  ],
})
export class HealthModule {}
