import type {
  Group,
  Member,
  Invitation,
  Pix,
  Role,
} from '../entities/group.js';
import type { Page, Paging } from '../../../../shared/domain/types.js';
export interface GroupRepository {
  lock(id: string): Promise<boolean>;
  create(
    data: { id: string; name: string; primaryColor: string; timezone: string },
    creatorId: string,
  ): Promise<Group>;
  find(id: string): Promise<Group | null>;
  list(userId: string, query: Paging): Promise<Page<Group>>;
  update(
    id: string,
    data: { name?: string; primaryColor?: string; timezone?: string },
  ): Promise<Group>;
}
export interface MembershipRepository {
  find(groupId: string, userId: string): Promise<Member | null>;
  list(groupId: string, query: Paging): Promise<Page<Member>>;
  countAdmins(groupId: string): Promise<number>;
  set(
    groupId: string,
    userId: string,
    data: { role: Role; active: boolean },
  ): Promise<Member>;
  join(groupId: string, userId: string, role: Role): Promise<Member>;
}
export interface InvitationRepository {
  create(
    data: Omit<
      Invitation,
      'acceptedAt' | 'acceptedBy' | 'revokedAt' | 'createdAt'
    >,
  ): Promise<Invitation>;
  find(groupId: string, id: string): Promise<Invitation | null>;
  findByHash(hash: string): Promise<Invitation | null>;
  list(
    groupId: string,
    query: Paging,
  ): Promise<Page<Omit<Invitation, 'tokenHash'>>>;
  consume(id: string, actorId: string, at: Date): Promise<void>;
  revoke(id: string, at: Date): Promise<void>;
}
export interface PixRepository {
  find(groupId: string): Promise<Pix | null>;
  save(data: Pix): Promise<Pix>;
  clear(groupId: string): Promise<void>;
}
export interface AuditWrite {
  groupId: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, string | number | boolean | null>;
}
export interface AuditEvent {
  id: string;
  groupId: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: unknown;
  createdAt: Date;
}
export interface AuditRepository {
  append(data: AuditWrite): Promise<void>;
  list(groupId: string, query: Paging): Promise<Page<AuditEvent>>;
}
