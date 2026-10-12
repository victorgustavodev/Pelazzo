import type {
  UnitOfWork,
  Repositories,
} from '../../../../shared/domain/unit-of-work.js';
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
  amount,
  text,
  choice,
  date,
  paging,
} from '../../../../shared/domain/validation.js';
import {
  BusinessError,
  conflict,
  missing,
  invalid,
} from '../../../../shared/domain/errors.js';
import {
  cents,
  settlement,
  assertSame,
  type Payment,
  type Expense,
  type Method,
} from '../../domain/entities/finance.js';
import type {
  PaymentWrite,
  ExpenseWrite,
} from '../../domain/repositories/finance.repositories.js';
export interface PaymentInput {
  participantId: string;
  matchParticipantId?: string | null;
  competence?: string | null;
  amountCents: number;
  receivedAt?: string;
  method: Method;
  idempotencyKey: string;
}
export interface ExpenseInput {
  matchId: string;
  description: string;
  amountCents: number;
  occurredAt?: string;
  idempotencyKey: string;
}
async function paymentWrite(
  r: Repositories,
  actor: Actor,
  groupId: string,
  input: PaymentInput,
  runtime: Runtime,
  replacesId: string | null = null,
): Promise<PaymentWrite> {
  await participant(r, groupId, input.participantId);
  const matchParticipantId = input.matchParticipantId ?? null;
  const competence = input.competence ?? null;
  if ((matchParticipantId === null) === (competence === null))
    invalid(
      'Informe uma participação ou uma competência mensal, exclusivamente.',
    );
  if (competence !== null && !/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(competence))
    invalid('Competência deve usar AAAA-MM.');
  if (
    matchParticipantId !== null &&
    (await participation(r, groupId, matchParticipantId)).participantId !==
      input.participantId
  )
    invalid('Participação pertence a outro participante.');
  return {
    id: runtime.id(),
    groupId,
    participantId: input.participantId,
    matchParticipantId,
    competence,
    amountCents: amount(input.amountCents),
    receivedAt:
      input.receivedAt === undefined ? runtime.now() : date(input.receivedAt),
    method: choice(input.method, ['PIX', 'CASH', 'OTHER'], 'Método'),
    recordedBy: actor.id,
    idempotencyKey: text(input.idempotencyKey, 'Chave de idempotência', 1, 128),
    replacesId,
  };
}
async function expenseWrite(
  r: Repositories,
  actor: Actor,
  groupId: string,
  input: ExpenseInput,
  runtime: Runtime,
  replacesId: string | null = null,
): Promise<ExpenseWrite> {
  await match(r, groupId, input.matchId);
  return {
    id: runtime.id(),
    groupId,
    matchId: input.matchId,
    description: text(input.description, 'Descrição', 1, 255),
    amountCents: amount(input.amountCents),
    occurredAt:
      input.occurredAt === undefined ? runtime.now() : date(input.occurredAt),
    recordedBy: actor.id,
    idempotencyKey: text(input.idempotencyKey, 'Chave de idempotência', 1, 128),
    replacesId,
  };
}
function samePayment(value: Payment, input: PaymentWrite, hasDate: boolean) {
  assertSame(
    value.participantId === input.participantId &&
      value.matchParticipantId === input.matchParticipantId &&
      value.competence === input.competence &&
      value.amountCents === input.amountCents &&
      value.method === input.method &&
      value.replacesId === input.replacesId &&
      (!hasDate || value.receivedAt.getTime() === input.receivedAt.getTime()),
  );
}
function sameExpense(value: Expense, input: ExpenseWrite, hasDate: boolean) {
  assertSame(
    value.matchId === input.matchId &&
      value.description === input.description &&
      value.amountCents === input.amountCents &&
      value.replacesId === input.replacesId &&
      (!hasDate || value.occurredAt.getTime() === input.occurredAt.getTime()),
  );
}
async function canReadPayment(
  r: Repositories,
  actor: Actor,
  groupId: string,
  value: Payment,
  admin: boolean,
) {
  if (
    !admin &&
    (await participant(r, groupId, value.participantId)).userId !== actor.id
  )
    throw new BusinessError('FORBIDDEN', 'Pagamento de outro participante.');
}
export class CreatePaymentUseCase {
  constructor(
    private readonly work: UnitOfWork,
    private readonly runtime: Runtime,
  ) {}
  execute(actor: Actor, groupId: string, input: PaymentInput) {
    return this.work.run(async (r) => {
      await access(r, actor, groupId, true);
      const data = await paymentWrite(r, actor, groupId, input, this.runtime);
      const existing = await r.payments.findByKey(groupId, data.idempotencyKey);
      if (existing) {
        samePayment(existing, data, input.receivedAt !== undefined);
        return existing;
      }
      const result = await r.payments.create(data);
      await audit(r, actor, groupId, 'PAYMENT_CREATED', 'Payment', result.id);
      return result;
    });
  }
}
export class ListPaymentsUseCase {
  constructor(private readonly work: UnitOfWork) {}
  execute(
    actor: Actor,
    groupId: string,
    query: Paging & { participantId?: string },
  ) {
    paging(query);
    return this.work.run(async (r) => {
      const member = await access(r, actor, groupId);
      if (query.participantId) {
        const player = await participant(r, groupId, query.participantId);
        if (member.role !== 'ADMIN' && player.userId !== actor.id)
          throw new BusinessError(
            'FORBIDDEN',
            'Financeiro de outro participante.',
          );
      }
      return r.payments.list(groupId, {
        ...query,
        ...(member.role !== 'ADMIN' ? { userId: actor.id } : {}),
      });
    });
  }
}
export class GetPaymentUseCase {
  constructor(private readonly work: UnitOfWork) {}
  execute(actor: Actor, groupId: string, id: string) {
    return this.work.run(async (r) => {
      const member = await access(r, actor, groupId);
      const result =
        (await r.payments.find(groupId, id)) ??
        missing('Pagamento não encontrado.');
      await canReadPayment(r, actor, groupId, result, member.role === 'ADMIN');
      return result;
    });
  }
}
export class VoidPaymentUseCase {
  constructor(
    private readonly work: UnitOfWork,
    private readonly runtime: Runtime,
  ) {}
  execute(actor: Actor, groupId: string, id: string, reason: string) {
    return this.work.run(async (r) => {
      await access(r, actor, groupId, true);
      const current =
        (await r.payments.find(groupId, id)) ??
        missing('Pagamento não encontrado.');
      const normalizedReason = text(reason, 'Motivo', 1, 500);
      if (current.status === 'VOIDED') {
        if (
          current.voidReason !== normalizedReason ||
          current.voidedBy !== actor.id
        )
          conflict('Pagamento já anulado.');
        return current;
      }
      const result = await r.payments.void(
        groupId,
        id,
        normalizedReason,
        actor.id,
        this.runtime.now(),
      );
      await audit(r, actor, groupId, 'PAYMENT_VOIDED', 'Payment', id);
      return result;
    });
  }
}
export class CorrectPaymentUseCase {
  constructor(
    private readonly work: UnitOfWork,
    private readonly runtime: Runtime,
  ) {}
  execute(
    actor: Actor,
    groupId: string,
    id: string,
    input: PaymentInput & { reason: string },
  ) {
    return this.work.run(async (r) => {
      await access(r, actor, groupId, true);
      const original =
        (await r.payments.find(groupId, id)) ??
        missing('Pagamento não encontrado.');
      const reason = text(input.reason, 'Motivo', 1, 500);
      const data = await paymentWrite(
        r,
        actor,
        groupId,
        input,
        this.runtime,
        id,
      );
      const existing = await r.payments.findByKey(groupId, data.idempotencyKey);
      if (existing) {
        samePayment(existing, data, input.receivedAt !== undefined);
        assertSame(
          original.status === 'VOIDED' && original.voidReason === reason,
        );
        return { original, replacement: existing };
      }
      if (original.status !== 'CONFIRMED') conflict('Pagamento já anulado.');
      const old = await r.payments.void(
        groupId,
        id,
        reason,
        actor.id,
        this.runtime.now(),
      );
      const replacement = await r.payments.create(data);
      await audit(r, actor, groupId, 'PAYMENT_CORRECTED', 'Payment', id, {
        replacementId: replacement.id,
      });
      return { original: old, replacement };
    });
  }
}
export class CreateExpenseUseCase {
  constructor(
    private readonly work: UnitOfWork,
    private readonly runtime: Runtime,
  ) {}
  execute(actor: Actor, groupId: string, input: ExpenseInput) {
    return this.work.run(async (r) => {
      await access(r, actor, groupId, true);
      const data = await expenseWrite(r, actor, groupId, input, this.runtime);
      const existing = await r.expenses.findByKey(groupId, data.idempotencyKey);
      if (existing) {
        sameExpense(existing, data, input.occurredAt !== undefined);
        return existing;
      }
      const result = await r.expenses.create(data);
      await audit(r, actor, groupId, 'EXPENSE_CREATED', 'Expense', result.id);
      return result;
    });
  }
}
export class ListExpensesUseCase {
  constructor(private readonly work: UnitOfWork) {}
  execute(actor: Actor, groupId: string, query: Paging & { matchId?: string }) {
    paging(query);
    return this.work.run(async (r) => {
      await access(r, actor, groupId, true);
      if (query.matchId) await match(r, groupId, query.matchId);
      return r.expenses.list(groupId, query);
    });
  }
}
export class GetExpenseUseCase {
  constructor(private readonly work: UnitOfWork) {}
  execute(actor: Actor, groupId: string, id: string) {
    return this.work.run(async (r) => {
      await access(r, actor, groupId, true);
      return (
        (await r.expenses.find(groupId, id)) ??
        missing('Despesa não encontrada.')
      );
    });
  }
}
export class VoidExpenseUseCase {
  constructor(
    private readonly work: UnitOfWork,
    private readonly runtime: Runtime,
  ) {}
  execute(actor: Actor, groupId: string, id: string, reason: string) {
    return this.work.run(async (r) => {
      await access(r, actor, groupId, true);
      const current =
        (await r.expenses.find(groupId, id)) ??
        missing('Despesa não encontrada.');
      const normalizedReason = text(reason, 'Motivo', 1, 500);
      if (current.status === 'VOIDED') {
        if (
          current.voidReason !== normalizedReason ||
          current.voidedBy !== actor.id
        )
          conflict('Despesa já anulada.');
        return current;
      }
      const result = await r.expenses.void(
        groupId,
        id,
        normalizedReason,
        actor.id,
        this.runtime.now(),
      );
      await audit(r, actor, groupId, 'EXPENSE_VOIDED', 'Expense', id);
      return result;
    });
  }
}
export class CorrectExpenseUseCase {
  constructor(
    private readonly work: UnitOfWork,
    private readonly runtime: Runtime,
  ) {}
  execute(
    actor: Actor,
    groupId: string,
    id: string,
    input: ExpenseInput & { reason: string },
  ) {
    return this.work.run(async (r) => {
      await access(r, actor, groupId, true);
      const original =
        (await r.expenses.find(groupId, id)) ??
        missing('Despesa não encontrada.');
      const reason = text(input.reason, 'Motivo', 1, 500);
      const data = await expenseWrite(
        r,
        actor,
        groupId,
        input,
        this.runtime,
        id,
      );
      const existing = await r.expenses.findByKey(groupId, data.idempotencyKey);
      if (existing) {
        sameExpense(existing, data, input.occurredAt !== undefined);
        assertSame(
          original.status === 'VOIDED' && original.voidReason === reason,
        );
        return { original, replacement: existing };
      }
      if (original.status !== 'CONFIRMED') conflict('Despesa já anulada.');
      const old = await r.expenses.void(
        groupId,
        id,
        reason,
        actor.id,
        this.runtime.now(),
      );
      const replacement = await r.expenses.create(data);
      await audit(r, actor, groupId, 'EXPENSE_CORRECTED', 'Expense', id, {
        replacementId: replacement.id,
      });
      return { original: old, replacement };
    });
  }
}
export class GetCashUseCase {
  constructor(private readonly work: UnitOfWork) {}
  execute(actor: Actor, groupId: string, matchId?: string) {
    return this.work.run(async (r) => {
      await access(r, actor, groupId);
      if (matchId) await match(r, groupId, matchId);
      const [income, expenses] = await Promise.all([
        r.payments.sum(groupId, { matchId }),
        r.expenses.sum(groupId, matchId),
      ]);
      return {
        revenueCents: cents(income),
        expenseCents: cents(expenses),
        balanceCents: cents(income - expenses),
        currency: 'BRL',
      };
    });
  }
}
export class GetSettlementUseCase {
  constructor(private readonly work: UnitOfWork) {}
  execute(actor: Actor, groupId: string, id: string) {
    return this.work.run(async (r) => {
      const member = await access(r, actor, groupId);
      const value = await participation(r, groupId, id);
      const player = await participant(r, groupId, value.participantId);
      if (member.role !== 'ADMIN' && player.userId !== actor.id)
        throw new BusinessError(
          'FORBIDDEN',
          'Financeiro de outro participante.',
        );
      return {
        participationId: id,
        ...settlement(
          value.expectedAmountCents,
          await r.payments.sum(groupId, { participationId: id }),
        ),
      };
    });
  }
}
