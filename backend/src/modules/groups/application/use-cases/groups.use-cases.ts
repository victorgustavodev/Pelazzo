import type { UnitOfWork } from '../../../../shared/domain/unit-of-work.js';
import type {
  Actor,
  Paging,
  Runtime,
} from '../../../../shared/domain/types.js';
import {
  BusinessError,
  conflict,
  missing,
  invalid,
} from '../../../../shared/domain/errors.js';
import { paging, text } from '../../../../shared/domain/validation.js';
import { access, audit } from '../../../../shared/application/access.js';
import {
  groupData,
  pixData,
  role,
  type Pix,
  type Invitation,
} from '../../domain/entities/group.js';
function invitationView(value: Invitation) {
  return {
    id: value.id,
    groupId: value.groupId,
    email: value.email,
    role: value.role,
    expiresAt: value.expiresAt,
    createdBy: value.createdBy,
    acceptedAt: value.acceptedAt,
    acceptedBy: value.acceptedBy,
    revokedAt: value.revokedAt,
    createdAt: value.createdAt,
  };
}
export class CreateGroupUseCase {
  constructor(
    private readonly work: UnitOfWork,
    private readonly runtime: Runtime,
  ) {}
  execute(
    actor: Actor,
    input: { name: string; primaryColor?: string; timezone?: string },
  ) {
    return this.work.run(async (r) => {
      const result = await r.groups.create(
        { id: this.runtime.id(), ...groupData(input) },
        actor.id,
      );
      await audit(r, actor, result.id, 'GROUP_CREATED', 'Group', result.id);
      return result;
    });
  }
}
export class ListGroupsUseCase {
  constructor(private readonly work: UnitOfWork) {}
  execute(actor: Actor, query: Paging) {
    paging(query);
    return this.work.run((r) => r.groups.list(actor.id, query));
  }
}
export class GetGroupUseCase {
  constructor(private readonly work: UnitOfWork) {}
  execute(actor: Actor, groupId: string) {
    return this.work.run(async (r) => {
      await access(r, actor, groupId);
      return (await r.groups.find(groupId)) ?? missing();
    });
  }
}
export class UpdateGroupUseCase {
  constructor(private readonly work: UnitOfWork) {}
  execute(
    actor: Actor,
    groupId: string,
    input: { name?: string; primaryColor?: string; timezone?: string },
  ) {
    return this.work.run(async (r) => {
      await access(r, actor, groupId, true);
      const current = (await r.groups.find(groupId)) ?? missing();
      const result = await r.groups.update(
        groupId,
        groupData({ ...current, ...input }),
      );
      await audit(r, actor, groupId, 'GROUP_UPDATED', 'Group', groupId);
      return result;
    });
  }
}
export class ListMembersUseCase {
  constructor(private readonly work: UnitOfWork) {}
  execute(actor: Actor, groupId: string, query: Paging) {
    paging(query);
    return this.work.run(async (r) => {
      await access(r, actor, groupId);
      return r.members.list(groupId, query);
    });
  }
}
export class GetMyMembershipUseCase {
  constructor(private readonly work: UnitOfWork) {}
  execute(actor: Actor, groupId: string) {
    return this.work.run((r) => access(r, actor, groupId));
  }
}
export class UpdateMemberUseCase {
  constructor(private readonly work: UnitOfWork) {}
  execute(
    actor: Actor,
    groupId: string,
    userId: string,
    input: { role?: 'USER' | 'ADMIN'; active?: boolean },
  ) {
    return this.work.run(async (r) => {
      await access(r, actor, groupId, true);
      const current =
        (await r.members.find(groupId, userId)) ??
        missing('Membro não encontrado.');
      const next = {
        role: input.role === undefined ? current.role : role(input.role),
        active: input.active ?? current.active,
      };
      if (
        current.role === 'ADMIN' &&
        current.active &&
        (next.role !== 'ADMIN' || !next.active) &&
        (await r.members.countAdmins(groupId)) <= 1
      )
        conflict('A pelada precisa manter pelo menos um administrador ativo.');
      const pix = await r.pix.find(groupId);
      const pixCleared = Boolean(
        pix?.recipientAdminUserId === userId &&
        (next.role !== 'ADMIN' || !next.active),
      );
      if (pixCleared) {
        await r.pix.clear(groupId);
        await audit(r, actor, groupId, 'PIX_CLEARED', 'PixSettings', groupId);
      }
      const member = await r.members.set(groupId, userId, next);
      await audit(
        r,
        actor,
        groupId,
        'MEMBER_UPDATED',
        'Membership',
        member.id,
        { role: member.role, active: member.active },
      );
      return { ...member, pixCleared };
    });
  }
}
export class CreateInvitationUseCase {
  constructor(
    private readonly work: UnitOfWork,
    private readonly runtime: Runtime,
  ) {}
  execute(
    actor: Actor,
    groupId: string,
    input: { email: string; role?: 'USER' | 'ADMIN'; ttlDays?: number },
  ) {
    return this.work.run(async (r) => {
      await access(r, actor, groupId, true);
      const email = text(input.email, 'E-mail', 3, 254).toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        invalid('E-mail inválido.');
      const days = input.ttlDays ?? 7;
      if (!Number.isInteger(days) || days < 1 || days > 30)
        invalid('Validade deve ser de 1 a 30 dias.');
      const token = this.runtime.token();
      const result = await r.invitations.create({
        id: this.runtime.id(),
        groupId,
        email,
        role: role(input.role ?? 'USER'),
        tokenHash: this.runtime.hash(token),
        createdBy: actor.id,
        expiresAt: new Date(this.runtime.now().getTime() + days * 86400000),
      });
      await audit(
        r,
        actor,
        groupId,
        'INVITATION_CREATED',
        'Invitation',
        result.id,
      );
      return { ...invitationView(result), token };
    });
  }
}
export class ListInvitationsUseCase {
  constructor(private readonly work: UnitOfWork) {}
  execute(actor: Actor, groupId: string, query: Paging) {
    paging(query);
    return this.work.run(async (r) => {
      await access(r, actor, groupId, true);
      return r.invitations.list(groupId, query);
    });
  }
}
export class RevokeInvitationUseCase {
  constructor(
    private readonly work: UnitOfWork,
    private readonly runtime: Runtime,
  ) {}
  execute(actor: Actor, groupId: string, id: string) {
    return this.work.run(async (r) => {
      await access(r, actor, groupId, true);
      const value = (await r.invitations.find(groupId, id)) ?? missing();
      if (value.acceptedAt) conflict('Convite já utilizado.');
      await r.invitations.revoke(id, this.runtime.now());
      await audit(r, actor, groupId, 'INVITATION_REVOKED', 'Invitation', id);
    });
  }
}
export class AcceptInvitationUseCase {
  constructor(
    private readonly work: UnitOfWork,
    private readonly runtime: Runtime,
  ) {}
  execute(actor: Actor, token: string) {
    return this.work.run(async (r) => {
      const hash = this.runtime.hash(text(token, 'Convite', 64, 64));
      let value =
        (await r.invitations.findByHash(hash)) ??
        missing('Convite não encontrado.');
      if (!(await r.groups.lock(value.groupId))) missing();
      value = (await r.invitations.findByHash(hash)) ?? missing();
      if (value.email !== actor.email.toLowerCase())
        throw new BusinessError(
          'FORBIDDEN',
          'Convite destinado a outro e-mail.',
        );
      if (
        value.acceptedAt ||
        value.revokedAt ||
        value.expiresAt <= this.runtime.now()
      )
        conflict('Convite expirado, revogado ou utilizado.');
      if ((await r.members.find(value.groupId, actor.id))?.active)
        conflict('Você já participa desta pelada.');
      const member = await r.members.join(value.groupId, actor.id, value.role);
      await r.invitations.consume(value.id, actor.id, this.runtime.now());
      await audit(
        r,
        actor,
        value.groupId,
        'INVITATION_ACCEPTED',
        'Membership',
        member.id,
      );
      return member;
    });
  }
}
export class GetPixUseCase {
  constructor(private readonly work: UnitOfWork) {}
  execute(actor: Actor, groupId: string) {
    return this.work.run(async (r) => {
      await access(r, actor, groupId);
      const pix = await r.pix.find(groupId);
      return pix
        ? {
            ...pix,
            receiptUrl: `https://wa.me/${pix.contactPhone.slice(1)}?text=${encodeURIComponent('Olá! Segue o comprovante da pelada.')}`,
          }
        : null;
    });
  }
}
export class UpdatePixUseCase {
  constructor(private readonly work: UnitOfWork) {}
  execute(actor: Actor, groupId: string, input: Omit<Pix, 'groupId'>) {
    return this.work.run(async (r) => {
      await access(r, actor, groupId, true);
      const recipient = await r.members.find(
        groupId,
        input.recipientAdminUserId,
      );
      if (!recipient?.active || recipient.role !== 'ADMIN')
        invalid('Destinatário precisa ser administrador ativo da pelada.');
      const result = await r.pix.save({ groupId, ...pixData(input) });
      await audit(r, actor, groupId, 'PIX_UPDATED', 'PixSettings', groupId);
      return result;
    });
  }
}
export class ClearPixUseCase {
  constructor(private readonly work: UnitOfWork) {}
  execute(actor: Actor, groupId: string) {
    return this.work.run(async (r) => {
      await access(r, actor, groupId, true);
      await r.pix.clear(groupId);
      await audit(r, actor, groupId, 'PIX_CLEARED', 'PixSettings', groupId);
    });
  }
}
export class ListAuditUseCase {
  constructor(private readonly work: UnitOfWork) {}
  execute(actor: Actor, groupId: string, query: Paging) {
    paging(query);
    return this.work.run(async (r) => {
      await access(r, actor, groupId, true);
      return r.audit.list(groupId, query);
    });
  }
}
