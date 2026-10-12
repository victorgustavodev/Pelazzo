import { Module } from '@nestjs/common';
import {
  UNIT_OF_WORK,
  type UnitOfWork,
} from '../../shared/domain/unit-of-work.js';
import { RUNTIME, type Runtime } from '../../shared/domain/types.js';
import * as Cases from './application/use-cases/matches.use-cases.js';
import * as Attendance from './application/use-cases/attendance.use-cases.js';
import {
  AttendanceLinksController,
  PublicAttendanceController,
} from './presentation/controllers/attendance.controller.js';
import {
  MatchesController,
  ParticipationsController,
} from './presentation/controllers/matches.controller.js';
@Module({
  controllers: [
    MatchesController,
    ParticipationsController,
    AttendanceLinksController,
    PublicAttendanceController,
  ],
  providers: [
    ...[
      Attendance.CreateAttendanceLinkUseCase,
      Attendance.GetAttendanceLinkUseCase,
      Attendance.RevokeAttendanceLinkUseCase,
      Attendance.GetPublicMatchUseCase,
      Attendance.ConfirmPublicAttendanceUseCase,
    ].map((useCase) => ({
      provide: useCase,
      inject: [UNIT_OF_WORK, RUNTIME],
      useFactory: (work: UnitOfWork, runtime: Runtime) =>
        new useCase(work, runtime),
    })),
    ...[Cases.CreateMatchUseCase, Cases.AddParticipationUseCase].map(
      (useCase) => ({
        provide: useCase,
        inject: [UNIT_OF_WORK, RUNTIME],
        useFactory: (work: UnitOfWork, runtime: Runtime) =>
          new useCase(work, runtime),
      }),
    ),
    ...[
      Cases.ListMatchesUseCase,
      Cases.GetMatchUseCase,
      Cases.UpdateMatchUseCase,
      Cases.CancelMatchUseCase,
      Cases.ListParticipationsUseCase,
      Cases.UpdateParticipationUseCase,
      Cases.RemoveParticipationUseCase,
    ].map((useCase) => ({
      provide: useCase,
      inject: [UNIT_OF_WORK],
      useFactory: (work: UnitOfWork) => new useCase(work),
    })),
  ],
})
export class MatchesModule {}
