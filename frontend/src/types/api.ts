export interface User {
  id: string;
  displayName: string;
  email: string;
}
export interface Grant {
  token: string;
  user: User;
}
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
export interface Group {
  id: string;
  name: string;
  primaryColor: string;
  timezone: string;
}
export interface Member {
  id: string;
  groupId: string;
  userId: string;
  displayName: string;
  role: 'ADMIN' | 'USER';
  active: boolean;
  pixCleared?: boolean;
}
export interface Participant {
  id: string;
  name: string;
  modality: 'MONTHLY' | 'DAILY';
  active: boolean;
  userId: string | null;
}
export interface Match {
  id: string;
  title: string;
  startsAt: string;
  location: string | null;
  status: 'SCHEDULED' | 'FINISHED' | 'CANCELED';
}
export interface Participation {
  publicConfirmedAt: string | null;
  id: string;
  matchId: string;
  participantId: string;
  modalitySnapshot: 'MONTHLY' | 'DAILY';
  expectedAmountCents?: number | null;
}
export interface Cash {
  revenueCents: number;
  expenseCents: number;
  balanceCents: number;
  currency: 'BRL';
}
export interface Settlement {
  participationId: string;
  status: 'UNDEFINED' | 'UNPAID' | 'PARTIAL' | 'PAID';
  expectedAmountCents: number | null;
  paidAmountCents: number;
  remainingAmountCents: number | null;
  excessAmountCents: number;
}
export interface Financial {
  id: string;
  amountCents: number;
  status: 'CONFIRMED' | 'VOIDED';
  voidReason: string | null;
  voidedAt: string | null;
  replacesId: string | null;
  idempotencyKey: string;
}
export interface Payment extends Financial {
  participantId: string;
  matchParticipantId: string | null;
  competence: string | null;
  receivedAt: string;
  method: 'PIX' | 'CASH' | 'OTHER';
}
export interface Expense extends Financial {
  matchId: string;
  description: string;
  occurredAt: string;
}
export interface Pix {
  recipientAdminUserId: string;
  keyType: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM';
  keyValue: string;
  recipientName: string;
  contactPhone: string;
  receiptUrl?: string;
}
export interface Invitation {
  id: string;
  email: string;
  role: 'ADMIN' | 'USER';
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  token?: string;
}
export interface Audit {
  id: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
}
export interface PublicMatch {
  groupName: string;
  primaryColor: string;
  timezone: string;
  title: string;
  startsAt: string;
  location: string;
}
export interface AttendanceReceipt {
  name: string;
  match: PublicMatch;
}
export interface AttendanceLinkState {
  link: { id: string; expiresAt: string; active: boolean } | null;
}
export interface DrawPlayer {
  id: string;
  name: string;
  goalkeeper: boolean;
}
export interface Draw {
  teams: { number: number; players: DrawPlayer[] }[];
}
export interface GroupContext {
  group: Group;
  member: Member;
  admin: boolean;
  user: User;
  revision: number;
  refresh: () => void;
}
