import { Module } from '@nestjs/common';
import {
  UNIT_OF_WORK,
  type UnitOfWork,
} from '../../shared/domain/unit-of-work.js';
import { RUNTIME, type Runtime } from '../../shared/domain/types.js';
import { DrawTeamsUseCase } from './application/use-cases/draw-teams.use-case.js';
import { DrawController } from './presentation/controllers/draw.controller.js';
@Module({
  controllers: [DrawController],
  providers: [
    {
      provide: DrawTeamsUseCase,
      inject: [UNIT_OF_WORK, RUNTIME],
      useFactory: (work: UnitOfWork, runtime: Runtime) =>
        new DrawTeamsUseCase(work, runtime),
    },
  ],
})
export class TeamDrawModule {}
