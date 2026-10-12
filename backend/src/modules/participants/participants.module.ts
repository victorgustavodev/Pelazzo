import { Module } from '@nestjs/common';
import {
  UNIT_OF_WORK,
  type UnitOfWork,
} from '../../shared/domain/unit-of-work.js';
import { RUNTIME, type Runtime } from '../../shared/domain/types.js';
import * as Cases from './application/use-cases/participants.use-cases.js';
import { ParticipantsController } from './presentation/controllers/participants.controller.js';
@Module({
  controllers: [ParticipantsController],
  providers: [
    {
      provide: Cases.CreateParticipantUseCase,
      inject: [UNIT_OF_WORK, RUNTIME],
      useFactory: (work: UnitOfWork, runtime: Runtime) =>
        new Cases.CreateParticipantUseCase(work, runtime),
    },
    ...[
      Cases.ListParticipantsUseCase,
      Cases.GetParticipantUseCase,
      Cases.UpdateParticipantUseCase,
      Cases.DeactivateParticipantUseCase,
    ].map((useCase) => ({
      provide: useCase,
      inject: [UNIT_OF_WORK],
      useFactory: (work: UnitOfWork) => new useCase(work),
    })),
  ],
})
export class ParticipantsModule {}
