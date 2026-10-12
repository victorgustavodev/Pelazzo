import type {
  GroupRepository,
  MembershipRepository,
  InvitationRepository,
  PixRepository,
  AuditRepository,
} from '../../modules/groups/domain/repositories/groups.repositories.js';
import type { ParticipantRepository } from '../../modules/participants/domain/repositories/participant.repository.js';
import type {
  MatchRepository,
  ParticipationRepository,
} from '../../modules/matches/domain/repositories/matches.repositories.js';
import type {
  PaymentRepository,
  ExpenseRepository,
} from '../../modules/finance/domain/repositories/finance.repositories.js';
export interface Repositories {
  groups: GroupRepository;
  members: MembershipRepository;
  invitations: InvitationRepository;
  pix: PixRepository;
  audit: AuditRepository;
  participants: ParticipantRepository;
  matches: MatchRepository;
  participations: ParticipationRepository;
  payments: PaymentRepository;
  expenses: ExpenseRepository;
}
export interface UnitOfWork {
  run<T>(operation: (repositories: Repositories) => Promise<T>): Promise<T>;
}
export const UNIT_OF_WORK = Symbol('UNIT_OF_WORK');
