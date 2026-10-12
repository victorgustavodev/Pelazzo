import { Prisma } from '../../../../generated/prisma/client.js';
import type {
  GroupRepository,
  MembershipRepository,
  InvitationRepository,
  PixRepository,
  AuditRepository,
  AuditWrite,
} from '../../domain/repositories/groups.repositories.js';
import type {
  Group,
  Member,
  Invitation,
  Pix,
  Role,
} from '../../domain/entities/group.js';
import type { Paging } from '../../../../shared/domain/types.js';
import { conflict } from '../../../../shared/domain/errors.js';
import { slice, page } from '../../../../shared/infrastructure/page.js';
type Tx = Prisma.TransactionClient;
const memberSelect = {
  id: true,
  groupId: true,
  userId: true,
  role: true,
  active: true,
  user: { select: { displayName: true } },
} as const;
const memberView = (value: {
  id: string;
  groupId: string;
  userId: string;
  role: Role;
  active: boolean;
  user: { displayName: string };
}): Member => ({
  id: value.id,
  groupId: value.groupId,
  userId: value.userId,
  role: value.role,
  active: value.active,
  displayName: value.user.displayName,
});
export class PrismaGroupRepository implements GroupRepository {
  constructor(private readonly tx: Tx) {}
  async lock(id: string) {
    const rows = await this.tx.$queryRaw<
      { id: string }[]
    >`SELECT id FROM groups WHERE id = ${id}::uuid FOR UPDATE`;
    return rows.length > 0;
  }
  create(
    data: { id: string; name: string; primaryColor: string; timezone: string },
    creatorId: string,
  ) {
    return this.tx.group.create({
      data: {
        ...data,
        memberships: { create: { userId: creatorId, role: 'ADMIN' } },
      },
    });
  }
  find(id: string) {
    return this.tx.group.findUnique({ where: { id } });
  }
  async list(userId: string, query: Paging) {
    const where = { memberships: { some: { userId, active: true } } };
    const [items, total] = await Promise.all([
      this.tx.group.findMany({
        where,
        ...slice(query),
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      }),
      this.tx.group.count({ where }),
    ]);
    return page(items, total, query);
  }
  update(
    id: string,
    data: Partial<Pick<Group, 'name' | 'primaryColor' | 'timezone'>>,
  ) {
    return this.tx.group.update({ where: { id }, data });
  }
}
export class PrismaMembershipRepository implements MembershipRepository {
  constructor(private readonly tx: Tx) {}
  async find(groupId: string, userId: string) {
    const value = await this.tx.membership.findUnique({
      where: { groupId_userId: { groupId, userId } },
      select: memberSelect,
    });
    return value ? memberView(value) : null;
  }
  async list(groupId: string, query: Paging) {
    const [items, total] = await Promise.all([
      this.tx.membership.findMany({
        where: { groupId },
        select: memberSelect,
        ...slice(query),
        orderBy: { id: 'asc' },
      }),
      this.tx.membership.count({ where: { groupId } }),
    ]);
    return page(items.map(memberView), total, query);
  }
  countAdmins(groupId: string) {
    return this.tx.membership.count({
      where: { groupId, role: 'ADMIN', active: true },
    });
  }
  async set(
    groupId: string,
    userId: string,
    data: { role: Role; active: boolean },
  ) {
    return memberView(
      await this.tx.membership.update({
        where: { groupId_userId: { groupId, userId } },
        data,
        select: memberSelect,
      }),
    );
  }
  async join(groupId: string, userId: string, role: Role) {
    return memberView(
      await this.tx.membership.upsert({
        where: { groupId_userId: { groupId, userId } },
        create: { groupId, userId, role, active: true },
        update: { role, active: true },
        select: memberSelect,
      }),
    );
  }
}
export class PrismaInvitationRepository implements InvitationRepository {
  constructor(private readonly tx: Tx) {}
  create(
    data: Omit<
      Invitation,
      'acceptedAt' | 'acceptedBy' | 'revokedAt' | 'createdAt'
    >,
  ) {
    return this.tx.groupInvitation.create({ data });
  }
  find(groupId: string, id: string) {
    return this.tx.groupInvitation.findFirst({ where: { groupId, id } });
  }
  findByHash(tokenHash: string) {
    return this.tx.groupInvitation.findUnique({ where: { tokenHash } });
  }
  async list(groupId: string, query: Paging) {
    const [rows, total] = await Promise.all([
      this.tx.groupInvitation.findMany({
        where: { groupId },
        ...slice(query),
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      }),
      this.tx.groupInvitation.count({ where: { groupId } }),
    ]);
    const items = rows.map(
      ({
        id,
        groupId,
        email,
        role,
        expiresAt,
        createdBy,
        acceptedAt,
        acceptedBy,
        revokedAt,
        createdAt,
      }) => ({
        id,
        groupId,
        email,
        role,
        expiresAt,
        createdBy,
        acceptedAt,
        acceptedBy,
        revokedAt,
        createdAt,
      }),
    );
    return page(items, total, query);
  }
  async consume(id: string, actorId: string, at: Date) {
    const result = await this.tx.groupInvitation.updateMany({
      where: { id, acceptedAt: null, revokedAt: null, expiresAt: { gt: at } },
      data: { acceptedAt: at, acceptedBy: actorId },
    });
    if (result.count !== 1) conflict('Convite expirado ou já utilizado.');
  }
  async revoke(id: string, at: Date) {
    await this.tx.groupInvitation.update({
      where: { id },
      data: { revokedAt: at },
    });
  }
}
export class PrismaPixRepository implements PixRepository {
  constructor(private readonly tx: Tx) {}
  find(groupId: string) {
    return this.tx.pixSettings.findUnique({ where: { groupId } });
  }
  save(data: Pix) {
    return this.tx.pixSettings.upsert({
      where: { groupId: data.groupId },
      create: data,
      update: data,
    });
  }
  async clear(groupId: string) {
    await this.tx.pixSettings.deleteMany({ where: { groupId } });
  }
}
export class PrismaAuditRepository implements AuditRepository {
  constructor(private readonly tx: Tx) {}
  async append(data: AuditWrite) {
    await this.tx.auditEvent.create({
      data: { ...data, metadata: data.metadata ?? {} },
    });
  }
  async list(groupId: string, query: Paging) {
    const [items, total] = await Promise.all([
      this.tx.auditEvent.findMany({
        where: { groupId },
        ...slice(query),
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      }),
      this.tx.auditEvent.count({ where: { groupId } }),
    ]);
    return page(items, total, query);
  }
}
