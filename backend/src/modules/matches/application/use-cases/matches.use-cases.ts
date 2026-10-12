import type { UnitOfWork } from '../../../../shared/domain/unit-of-work.js';
import type {
  Actor,
  Paging,
  Runtime,
} from '../../../../shared/domain/types.js';
import {
  access,
  audit,
  match,
  participant,
  participation,
} from '../../../../shared/application/access.js';
import {
  text,
  date,
  choice,
  amount,
  paging,
} from '../../../../shared/domain/validation.js';
import { invalid, conflict } from '../../../../shared/domain/errors.js';
import type { MatchStatus } from '../../domain/entities/match.js';
export interface MatchInput {
  title: string;
  startsAt: string;
  location?: string | null;
}
export class CreateMatchUseCase {
  constructor(
    private readonly work: UnitOfWork,
    private readonly runtime: Runtime,
  ) {}
  execute(actor: Actor, groupId: string, input: MatchInput) {
    return this.work.run(async (r) => {
      await access(r, actor, groupId, true);
      const result = await r.matches.create({
        id: this.runtime.id(),
        groupId,
        title: text(input.title, 'Título'),
        startsAt: date(input.startsAt),
        location:
          input.location == null ? null : text(input.location, 'Local', 1, 255),
        status: 'SCHEDULED',
      });
      await audit(r, actor, groupId, 'MATCH_CREATED', 'Match', result.id);
      return result;
    });
  }
}
export class ListMatchesUseCase {
  constructor(private readonly work: UnitOfWork) {}
  execute(actor: Actor, groupId: string, query: Paging) {
    paging(query);
    return this.work.run(async (r) => {
      await access(r, actor, groupId);
      return r.matches.list(groupId, query);
    });
  }
}
export class GetMatchUseCase {
  constructor(private readonly work: UnitOfWork) {}
  execute(actor: Actor, groupId: string, id: string) {
    return this.work.run(async (r) => {
      await access(r, actor, groupId);
      return match(r, groupId, id);
    });
  }
}
export class UpdateMatchUseCase {
  constructor(private readonly work: UnitOfWork) {}
  execute(
    actor: Actor,
    groupId: string,
    id: string,
    input: Partial<MatchInput> & { status?: MatchStatus },
  ) {
    return this.work.run(async (r) => {
      await access(r, actor, groupId, true);
      await match(r, groupId, id);
      const result = await r.matches.update(groupId, id, {
        ...(input.title !== undefined
          ? { title: text(input.title, 'Título') }
          : {}),
        ...(input.startsAt !== undefined
          ? { startsAt: date(input.startsAt) }
          : {}),
        ...(input.location !== undefined
          ? {
              location:
                input.location === null
                  ? null
                  : text(input.location, 'Local', 1, 255),
            }
          : {}),
        ...(input.status !== undefined
          ? {
              status: choice(
                input.status,
                ['SCHEDULED', 'FINISHED', 'CANCELED'] as const,
                'Estado',
              ),
            }
          : {}),
      });
      await audit(r, actor, groupId, 'MATCH_UPDATED', 'Match', id);
      return result;
    });
  }
}
export class CancelMatchUseCase {
  constructor(private readonly work: UnitOfWork) {}
  execute(actor: Actor, groupId: string, id: string) {
    return this.work.run(async (r) => {
      await access(r, actor, groupId, true);
      await match(r, groupId, id);
      await r.matches.update(groupId, id, { status: 'CANCELED' });
      await audit(r, actor, groupId, 'MATCH_CANCELED', 'Match', id);
    });
  }
}
export class AddParticipationUseCase {
  constructor(
    private readonly work: UnitOfWork,
    private readonly runtime: Runtime,
  ) {}
  execute(
    actor: Actor,
    groupId: string,
    matchId: string,
    input: { participantId: string; expectedAmountCents?: number | null },
  ) {
    return this.work.run(async (r) => {
      await access(r, actor, groupId, true);
      await match(r, groupId, matchId);
      const player = await participant(r, groupId, input.participantId);
      if (!player.active) invalid('Participante inativo.');
      const result = await r.participations.create({
        id: this.runtime.id(),
        groupId,
        matchId,
        participantId: player.id,
        modalitySnapshot: player.modality,
        expectedAmountCents:
          input.expectedAmountCents == null
            ? null
            : amount(input.expectedAmountCents),
      });
      await audit(
        r,
        actor,
        groupId,
        'PARTICIPATION_CREATED',
        'MatchParticipant',
        result.id,
      );
      return result;
    });
  }
}
export class ListParticipationsUseCase {
  constructor(private readonly work: UnitOfWork) {}
  execute(actor: Actor, groupId: string, matchId: string, query: Paging) {
    paging(query);
    return this.work.run(async (r) => {
      const member = await access(r, actor, groupId);
      await match(r, groupId, matchId);
      const result = await r.participations.list(groupId, matchId, query);
      const items = await Promise.all(
        result.items.map(async (row) => {
          const player = await participant(r, groupId, row.participantId);
          const canSee = member.role === 'ADMIN' || player.userId === actor.id;
          return {
            id: row.id,
            groupId: row.groupId,
            matchId: row.matchId,
            participantId: row.participantId,
            modalitySnapshot: row.modalitySnapshot,
            publicConfirmedAt: row.publicConfirmedAt,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            ...(canSee ? { expectedAmountCents: row.expectedAmountCents } : {}),
          };
        }),
      );
      return { ...result, items };
    });
  }
}
export class UpdateParticipationUseCase {
  constructor(private readonly work: UnitOfWork) {}
  execute(
    actor: Actor,
    groupId: string,
    id: string,
    expectedAmountCents: number | null,
  ) {
    return this.work.run(async (r) => {
      await access(r, actor, groupId, true);
      await participation(r, groupId, id);
      const result = await r.participations.update(
        groupId,
        id,
        expectedAmountCents === null ? null : amount(expectedAmountCents),
      );
      await audit(
        r,
        actor,
        groupId,
        'PARTICIPATION_UPDATED',
        'MatchParticipant',
        id,
      );
      return result;
    });
  }
}
export class RemoveParticipationUseCase {
  constructor(private readonly work: UnitOfWork) {}
  execute(actor: Actor, groupId: string, id: string) {
    return this.work.run(async (r) => {
      await access(r, actor, groupId, true);
      await participation(r, groupId, id);
      if (await r.payments.hasHistory(groupId, id))
        conflict('Presença possui histórico financeiro e deve ser preservada.');
      await r.participations.remove(groupId, id);
      await audit(
        r,
        actor,
        groupId,
        'PARTICIPATION_REMOVED',
        'MatchParticipant',
        id,
      );
    });
  }
}
