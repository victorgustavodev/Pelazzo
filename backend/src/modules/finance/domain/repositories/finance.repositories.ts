import type { Payment, Expense } from '../entities/finance.js';
import type { Page, Paging } from '../../../../shared/domain/types.js';
export type PaymentWrite = Omit<
  Payment,
  | 'currency'
  | 'status'
  | 'voidReason'
  | 'voidedBy'
  | 'voidedAt'
  | 'createdAt'
  | 'updatedAt'
>;
export type ExpenseWrite = Omit<
  Expense,
  | 'currency'
  | 'status'
  | 'voidReason'
  | 'voidedBy'
  | 'voidedAt'
  | 'createdAt'
  | 'updatedAt'
>;
export interface PaymentRepository {
  find(groupId: string, id: string): Promise<Payment | null>;
  findByKey(groupId: string, key: string): Promise<Payment | null>;
  list(
    groupId: string,
    query: Paging & { participantId?: string; userId?: string },
  ): Promise<Page<Payment>>;
  create(data: PaymentWrite): Promise<Payment>;
  void(
    groupId: string,
    id: string,
    reason: string,
    actorId: string,
    at: Date,
  ): Promise<Payment>;
  sum(
    groupId: string,
    scope?: { matchId?: string; participationId?: string },
  ): Promise<bigint>;
  hasHistory(groupId: string, participationId: string): Promise<boolean>;
}
export interface ExpenseRepository {
  find(groupId: string, id: string): Promise<Expense | null>;
  findByKey(groupId: string, key: string): Promise<Expense | null>;
  list(
    groupId: string,
    query: Paging & { matchId?: string },
  ): Promise<Page<Expense>>;
  create(data: ExpenseWrite): Promise<Expense>;
  void(
    groupId: string,
    id: string,
    reason: string,
    actorId: string,
    at: Date,
  ): Promise<Expense>;
  sum(groupId: string, matchId?: string): Promise<bigint>;
}
