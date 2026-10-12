import { invalid, conflict } from '../../../../shared/domain/errors.js';
export type FinancialStatus = 'CONFIRMED' | 'VOIDED';
export type Method = 'PIX' | 'CASH' | 'OTHER';
export interface Payment {
  id: string;
  groupId: string;
  participantId: string;
  matchParticipantId: string | null;
  competence: string | null;
  amountCents: number;
  currency: string;
  receivedAt: Date;
  method: Method;
  status: FinancialStatus;
  recordedBy: string;
  voidReason: string | null;
  voidedBy: string | null;
  voidedAt: Date | null;
  idempotencyKey: string;
  replacesId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
export interface Expense {
  id: string;
  groupId: string;
  matchId: string;
  description: string;
  amountCents: number;
  currency: string;
  occurredAt: Date;
  status: FinancialStatus;
  recordedBy: string;
  voidReason: string | null;
  voidedBy: string | null;
  voidedAt: Date | null;
  idempotencyKey: string;
  replacesId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
export function cents(value: bigint): number {
  if (
    value > BigInt(Number.MAX_SAFE_INTEGER) ||
    value < BigInt(Number.MIN_SAFE_INTEGER)
  )
    invalid('Total excede o limite numérico suportado.');
  return Number(value);
}
export function settlement(expected: number | null, paid: bigint) {
  const paidAmountCents = cents(paid);
  if (expected === null)
    return {
      status: 'UNDEFINED',
      expectedAmountCents: null,
      paidAmountCents,
      remainingAmountCents: null,
      excessAmountCents: 0,
    };
  return {
    status:
      paidAmountCents >= expected
        ? 'PAID'
        : paidAmountCents > 0
          ? 'PARTIAL'
          : 'UNPAID',
    expectedAmountCents: expected,
    paidAmountCents,
    remainingAmountCents: Math.max(0, expected - paidAmountCents),
    excessAmountCents: Math.max(0, paidAmountCents - expected),
  };
}
export function assertSame(condition: boolean): void {
  if (!condition)
    conflict('Chave de idempotência já usada com conteúdo diferente.');
}
