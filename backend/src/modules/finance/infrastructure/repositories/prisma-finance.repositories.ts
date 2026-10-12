import { Prisma } from '../../../../generated/prisma/client.js';
import type {
  PaymentRepository,
  ExpenseRepository,
  PaymentWrite,
  ExpenseWrite,
} from '../../domain/repositories/finance.repositories.js';
import type { Paging } from '../../../../shared/domain/types.js';
import { conflict } from '../../../../shared/domain/errors.js';
import { slice, page } from '../../../../shared/infrastructure/page.js';
export class PrismaPaymentRepository implements PaymentRepository {
  constructor(private readonly tx: Prisma.TransactionClient) {}
  find(groupId: string, id: string) {
    return this.tx.payment.findFirst({ where: { groupId, id } });
  }
  findByKey(groupId: string, idempotencyKey: string) {
    return this.tx.payment.findUnique({
      where: { groupId_idempotencyKey: { groupId, idempotencyKey } },
    });
  }
  async list(
    groupId: string,
    query: Paging & { participantId?: string; userId?: string },
  ) {
    const where = {
      groupId,
      participantId: query.participantId,
      ...(query.userId ? { participant: { userId: query.userId } } : {}),
    };
    const [items, total] = await Promise.all([
      this.tx.payment.findMany({
        where,
        ...slice(query),
        orderBy: [{ receivedAt: 'desc' }, { id: 'asc' }],
      }),
      this.tx.payment.count({ where }),
    ]);
    return page(items, total, query);
  }
  create(data: PaymentWrite) {
    return this.tx.payment.create({ data });
  }
  async void(
    groupId: string,
    id: string,
    reason: string,
    actorId: string,
    at: Date,
  ) {
    const changed = await this.tx.payment.updateMany({
      where: { groupId, id, status: 'CONFIRMED' },
      data: {
        status: 'VOIDED',
        voidReason: reason,
        voidedBy: actorId,
        voidedAt: at,
      },
    });
    if (changed.count !== 1) conflict('Pagamento já anulado.');
    return this.tx.payment.findUniqueOrThrow({ where: { id } });
  }
  async sum(
    groupId: string,
    scope: { matchId?: string; participationId?: string } = {},
  ) {
    const rows = await this.tx.$queryRaw<
      { cents: string }[]
    >(Prisma.sql`SELECT COALESCE(SUM(p.amount_cents), 0)::text AS cents FROM payments p
      LEFT JOIN match_participants mp ON (mp.group_id, mp.id, mp.participant_id) = (p.group_id, p.match_participant_id, p.participant_id)
      WHERE p.group_id = ${groupId}::uuid AND p.status = 'CONFIRMED'
      ${scope.matchId ? Prisma.sql`AND mp.match_id = ${scope.matchId}::uuid` : Prisma.empty}
      ${scope.participationId ? Prisma.sql`AND p.match_participant_id = ${scope.participationId}::uuid` : Prisma.empty}`);
    return BigInt(rows[0].cents);
  }
  async hasHistory(groupId: string, matchParticipantId: string) {
    return (
      (await this.tx.payment.count({
        where: { groupId, matchParticipantId },
      })) > 0
    );
  }
}
export class PrismaExpenseRepository implements ExpenseRepository {
  constructor(private readonly tx: Prisma.TransactionClient) {}
  find(groupId: string, id: string) {
    return this.tx.expense.findFirst({ where: { groupId, id } });
  }
  findByKey(groupId: string, idempotencyKey: string) {
    return this.tx.expense.findUnique({
      where: { groupId_idempotencyKey: { groupId, idempotencyKey } },
    });
  }
  async list(groupId: string, query: Paging & { matchId?: string }) {
    const where = { groupId, matchId: query.matchId };
    const [items, total] = await Promise.all([
      this.tx.expense.findMany({
        where,
        ...slice(query),
        orderBy: [{ occurredAt: 'desc' }, { id: 'asc' }],
      }),
      this.tx.expense.count({ where }),
    ]);
    return page(items, total, query);
  }
  create(data: ExpenseWrite) {
    return this.tx.expense.create({ data });
  }
  async void(
    groupId: string,
    id: string,
    reason: string,
    actorId: string,
    at: Date,
  ) {
    const changed = await this.tx.expense.updateMany({
      where: { groupId, id, status: 'CONFIRMED' },
      data: {
        status: 'VOIDED',
        voidReason: reason,
        voidedBy: actorId,
        voidedAt: at,
      },
    });
    if (changed.count !== 1) conflict('Despesa já anulada.');
    return this.tx.expense.findUniqueOrThrow({ where: { id } });
  }
  async sum(groupId: string, matchId?: string) {
    const rows = await this.tx.$queryRaw<{ cents: string }[]>(
      Prisma.sql`SELECT COALESCE(SUM(amount_cents), 0)::text AS cents FROM expenses WHERE group_id = ${groupId}::uuid AND status = 'CONFIRMED' ${matchId ? Prisma.sql`AND match_id = ${matchId}::uuid` : Prisma.empty}`,
    );
    return BigInt(rows[0].cents);
  }
}
