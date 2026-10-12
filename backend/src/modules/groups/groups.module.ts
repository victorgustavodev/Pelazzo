import { Module } from '@nestjs/common';
import {
  UNIT_OF_WORK,
  type UnitOfWork,
} from '../../shared/domain/unit-of-work.js';
import { RUNTIME, type Runtime } from '../../shared/domain/types.js';
import * as Cases from './application/use-cases/groups.use-cases.js';
import {
  GroupsController,
  InvitationsController,
} from './presentation/controllers/groups.controller.js';
@Module({
  controllers: [GroupsController, InvitationsController],
  providers: [
    ...[
      Cases.CreateGroupUseCase,
      Cases.CreateInvitationUseCase,
      Cases.AcceptInvitationUseCase,
      Cases.RevokeInvitationUseCase,
    ].map((useCase) => ({
      provide: useCase,
      inject: [UNIT_OF_WORK, RUNTIME],
      useFactory: (work: UnitOfWork, runtime: Runtime) =>
        new useCase(work, runtime),
    })),
    ...[
      Cases.ListGroupsUseCase,
      Cases.GetGroupUseCase,
      Cases.UpdateGroupUseCase,
      Cases.ListMembersUseCase,
      Cases.GetMyMembershipUseCase,
      Cases.UpdateMemberUseCase,
      Cases.ListInvitationsUseCase,
      Cases.GetPixUseCase,
      Cases.UpdatePixUseCase,
      Cases.ClearPixUseCase,
      Cases.ListAuditUseCase,
    ].map((useCase) => ({
      provide: useCase,
      inject: [UNIT_OF_WORK],
      useFactory: (work: UnitOfWork) => new useCase(work),
    })),
  ],
})
export class GroupsModule {}
