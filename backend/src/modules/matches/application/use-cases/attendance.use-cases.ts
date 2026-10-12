import type {
  UnitOfWork,
  Repositories,
} from '../../../../shared/domain/unit-of-work.js';
import type { Actor, Runtime } from '../../../../shared/domain/types.js';
import { access, audit, match } from '../../../../shared/application/access.js';
import { text } from '../../../../shared/domain/validation.js';
import {
  invalid,
  missing,
  conflict,
} from '../../../../shared/domain/errors.js';
import { attendanceName } from '../../domain/entities/attendance.js';
function secret(value: string) {
  if (!/^[0-9a-f]{64}$/.test(value)) invalid('Link de presença inválido.');
  return value;
}
async function publicMatch(r: Repositories, runtime: Runtime, token: string) {
  const hash = runtime.hash(secret(token));
  const candidate = await r.attendanceLinks.findByHash(hash);
  if (!candidate || !(await r.groups.lock(candidate.groupId)))
    missing('Este link de presença não está disponível.');
  // Revalida depois do bloqueio: uma renovação/revogação concorrente não é ignorada.
  const link = await r.attendanceLinks.findByHash(hash);
  if (!link || link.revokedAt || link.expiresAt <= runtime.now())
    missing('Este link de presença não está disponível.');
  const game = await match(r, link.groupId, link.matchId);
  if (game.status !== 'SCHEDULED' || !game.location)
    missing('Esta partida não está recebendo confirmações.');
  const group = (await r.groups.find(link.groupId)) ?? missing();
  return {
    link,
    game,
    summary: {
      groupName: group.name,
      primaryColor: group.primaryColor,
      timezone: group.timezone,
      title: game.title,
      startsAt: game.startsAt,
      location: game.location,
    },
  };
}
export class CreateAttendanceLinkUseCase {
  constructor(
    private readonly work: UnitOfWork,
    private readonly runtime: Runtime,
  ) {}
  execute(
    actor: Actor,
    groupId: string,
    matchId: string,
    input: { location?: string },
  ) {
    return this.work.run(async (r) => {
      await access(r, actor, groupId, true);
      const game = await match(r, groupId, matchId);
      if (game.status !== 'SCHEDULED')
        invalid(
          'Somente partidas agendadas podem abrir confirmação de presença.',
        );
      const location =
        input.location === undefined
          ? game.location
          : text(input.location, 'Campo ou endereço', 1, 255);
      if (!location)
        invalid('Informe o campo ou endereço antes de gerar o link.');
      const expiresAt = new Date(game.startsAt.getTime() + 24 * 60 * 60 * 1000);
      if (expiresAt <= this.runtime.now())
        invalid('Atualize a data da partida antes de gerar o link.');
      if (location !== game.location) {
        await r.matches.update(groupId, matchId, { location });
        await audit(r, actor, groupId, 'MATCH_UPDATED', 'Match', matchId);
      }
      const token = this.runtime.token();
      const result = await r.attendanceLinks.save({
        id: this.runtime.id(),
        groupId,
        matchId,
        tokenHash: this.runtime.hash(token),
        createdBy: actor.id,
        expiresAt,
        revokedAt: null,
      });
      await audit(
        r,
        actor,
        groupId,
        'ATTENDANCE_LINK_CREATED',
        'MatchAttendanceLink',
        result.id,
      );
      return { token, expiresAt: result.expiresAt };
    });
  }
}
export class GetAttendanceLinkUseCase {
  constructor(
    private readonly work: UnitOfWork,
    private readonly runtime: Runtime,
  ) {}
  execute(actor: Actor, groupId: string, matchId: string) {
    return this.work.run(async (r) => {
      await access(r, actor, groupId, true);
      const game = await match(r, groupId, matchId);
      const link = await r.attendanceLinks.findForMatch(groupId, matchId);
      return {
        link: link
          ? {
              id: link.id,
              expiresAt: link.expiresAt,
              active:
                !link.revokedAt &&
                link.expiresAt > this.runtime.now() &&
                game.status === 'SCHEDULED' &&
                Boolean(game.location),
            }
          : null,
      };
    });
  }
}
export class RevokeAttendanceLinkUseCase {
  constructor(
    private readonly work: UnitOfWork,
    private readonly runtime: Runtime,
  ) {}
  execute(actor: Actor, groupId: string, matchId: string) {
    return this.work.run(async (r) => {
      await access(r, actor, groupId, true);
      await match(r, groupId, matchId);
      const link = await r.attendanceLinks.findForMatch(groupId, matchId);
      if (!link) missing('Link de presença não encontrado.');
      if (link.revokedAt) return;
      await r.attendanceLinks.revoke(groupId, matchId, this.runtime.now());
      await audit(
        r,
        actor,
        groupId,
        'ATTENDANCE_LINK_REVOKED',
        'MatchAttendanceLink',
        link.id,
      );
    });
  }
}
export class GetPublicMatchUseCase {
  constructor(
    private readonly work: UnitOfWork,
    private readonly runtime: Runtime,
  ) {}
  execute(token: string) {
    return this.work.run(
      async (r) => (await publicMatch(r, this.runtime, token)).summary,
    );
  }
}
export class ConfirmPublicAttendanceUseCase {
  constructor(
    private readonly work: UnitOfWork,
    private readonly runtime: Runtime,
  ) {}
  execute(token: string, inputName: string) {
    const name = attendanceName(inputName);
    return this.work.run(async (r) => {
      const { link, summary } = await publicMatch(r, this.runtime, token);
      const candidates = await r.participants.findActiveByName(
        link.groupId,
        name,
      );
      if (candidates.length > 1)
        conflict(
          'Use seu nome com sobrenome ou apelido para distinguir jogadores com o mesmo nome.',
        );
      const player =
        candidates[0] ??
        (await r.participants.create({
          id: this.runtime.id(),
          groupId: link.groupId,
          userId: null,
          name,
          modality: 'DAILY',
          active: true,
        }));
      if (!candidates.length)
        await r.audit.append({
          groupId: link.groupId,
          actorUserId: null,
          action: 'PARTICIPANT_CREATED_VIA_LINK',
          entityType: 'Participant',
          entityId: player.id,
        });
      const existing = await r.participations.findForParticipant(
        link.groupId,
        link.matchId,
        player.id,
      );
      const presence =
        existing ??
        (await r.participations.create({
          id: this.runtime.id(),
          groupId: link.groupId,
          matchId: link.matchId,
          participantId: player.id,
          modalitySnapshot: player.modality,
          expectedAmountCents: null,
        }));
      if (!presence.publicConfirmedAt) {
        await r.participations.confirmPublic(
          link.groupId,
          presence.id,
          this.runtime.now(),
        );
        await r.audit.append({
          groupId: link.groupId,
          actorUserId: null,
          action: 'ATTENDANCE_CONFIRMED_VIA_LINK',
          entityType: 'MatchParticipant',
          entityId: presence.id,
        });
      }
      return { name: player.name, match: summary };
    });
  }
}
