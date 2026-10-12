import type { Repositories } from '../domain/unit-of-work.js';
import type { Actor } from '../domain/types.js';
import { BusinessError, missing } from '../domain/errors.js';
export async function access(
  repos: Repositories,
  actor: Actor,
  groupId: string,
  admin = false,
) {
  // O bloqueio serializa alterações de perfil, Pix e financeiro na pelada.
  if (!(await repos.groups.lock(groupId))) missing('Pelada não encontrada.');
  const member = await repos.members.find(groupId, actor.id);
  if (!member?.active || (admin && member.role !== 'ADMIN'))
    throw new BusinessError('FORBIDDEN', 'Sem permissão nesta pelada.');
  return member;
}
export function audit(
  repos: Repositories,
  actor: Actor,
  groupId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, string | number | boolean | null>,
) {
  return repos.audit.append({
    groupId,
    actorUserId: actor.id,
    action,
    entityType,
    entityId,
    metadata,
  });
}
export async function participant(
  repos: Repositories,
  groupId: string,
  id: string,
) {
  const value = await repos.participants.find(groupId, id);
  return value ?? missing('Participante não encontrado.');
}
export async function match(repos: Repositories, groupId: string, id: string) {
  const value = await repos.matches.find(groupId, id);
  return value ?? missing('Partida não encontrada.');
}
export async function participation(
  repos: Repositories,
  groupId: string,
  id: string,
) {
  const value = await repos.participations.find(groupId, id);
  return value ?? missing('Participação não encontrada.');
}
