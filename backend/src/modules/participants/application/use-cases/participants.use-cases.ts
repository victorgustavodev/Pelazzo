import type { UnitOfWork } from '../../../../shared/domain/unit-of-work.js';
import type {
  Actor,
  Paging,
  Runtime,
} from '../../../../shared/domain/types.js';
import {
  access,
  audit,
  participant,
} from '../../../../shared/application/access.js';
import { text, choice, paging } from '../../../../shared/domain/validation.js';
import { invalid } from '../../../../shared/domain/errors.js';
import type { Modality } from '../../domain/entities/participant.js';
export interface ParticipantInput {
  name: string;
  modality: Modality;
  userId?: string | null;
}
export class CreateParticipantUseCase {
  constructor(
    private readonly work: UnitOfWork,
    private readonly runtime: Runtime,
  ) {}
  execute(actor: Actor, groupId: string, input: ParticipantInput) {
    return this.work.run(async (r) => {
      await access(r, actor, groupId, true);
      if (
        input.userId &&
        !(await r.members.find(groupId, input.userId))?.active
      )
        invalid('Conta precisa ser membro ativo da pelada.');
      const result = await r.participants.create({
        id: this.runtime.id(),
        groupId,
        name: text(input.name, 'Nome'),
        modality: choice(input.modality, ['MONTHLY', 'DAILY'], 'Modalidade'),
        userId: input.userId ?? null,
        active: true,
      });
      await audit(
        r,
        actor,
        groupId,
        'PARTICIPANT_CREATED',
        'Participant',
        result.id,
      );
      return result;
    });
  }
}
export class ListParticipantsUseCase {
  constructor(private readonly work: UnitOfWork) {}
  execute(actor: Actor, groupId: string, query: Paging) {
    paging(query);
    return this.work.run(async (r) => {
      await access(r, actor, groupId);
      return r.participants.list(groupId, query);
    });
  }
}
export class GetParticipantUseCase {
  constructor(private readonly work: UnitOfWork) {}
  execute(actor: Actor, groupId: string, id: string) {
    return this.work.run(async (r) => {
      await access(r, actor, groupId);
      return participant(r, groupId, id);
    });
  }
}
export class UpdateParticipantUseCase {
  constructor(private readonly work: UnitOfWork) {}
  execute(
    actor: Actor,
    groupId: string,
    id: string,
    input: Partial<ParticipantInput> & { active?: boolean },
  ) {
    return this.work.run(async (r) => {
      await access(r, actor, groupId, true);
      await participant(r, groupId, id);
      if (
        input.userId &&
        !(await r.members.find(groupId, input.userId))?.active
      )
        invalid('Conta precisa ser membro ativo da pelada.');
      const result = await r.participants.update(groupId, id, {
        ...input,
        ...(input.name !== undefined ? { name: text(input.name, 'Nome') } : {}),
        ...(input.modality !== undefined
          ? {
              modality: choice(
                input.modality,
                ['MONTHLY', 'DAILY'] as const,
                'Modalidade',
              ),
            }
          : {}),
      });
      await audit(r, actor, groupId, 'PARTICIPANT_UPDATED', 'Participant', id);
      return result;
    });
  }
}
export class DeactivateParticipantUseCase {
  constructor(private readonly work: UnitOfWork) {}
  execute(actor: Actor, groupId: string, id: string) {
    return this.work.run(async (r) => {
      await access(r, actor, groupId, true);
      await participant(r, groupId, id);
      await r.participants.update(groupId, id, { active: false });
      await audit(
        r,
        actor,
        groupId,
        'PARTICIPANT_DEACTIVATED',
        'Participant',
        id,
      );
    });
  }
}
