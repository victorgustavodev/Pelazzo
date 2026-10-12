import type { Prisma } from '../../../../generated/prisma/client.js';
import type { ParticipantRepository } from '../../domain/repositories/participant.repository.js';
import type { Participant } from '../../domain/entities/participant.js';
import type { Paging } from '../../../../shared/domain/types.js';
import { slice, page } from '../../../../shared/infrastructure/page.js';
export class PrismaParticipantRepository implements ParticipantRepository {
  constructor(private readonly tx: Prisma.TransactionClient) {}
  findActiveByName(groupId: string, name: string) {
    return this.tx.$queryRaw<
      Participant[]
    >`SELECT id, group_id AS "groupId", user_id AS "userId", name, modality, active, created_at AS "createdAt", updated_at AS "updatedAt" FROM participants WHERE group_id = ${groupId}::uuid AND active = TRUE AND lower(regexp_replace(normalize(btrim(name), NFC), '[[:space:]]+', ' ', 'g')) = lower(${name}) LIMIT 2`;
  }
  find(groupId: string, id: string) {
    return this.tx.participant.findFirst({ where: { groupId, id } });
  }
  async list(groupId: string, query: Paging) {
    const [items, total] = await Promise.all([
      this.tx.participant.findMany({
        where: { groupId },
        ...slice(query),
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
      }),
      this.tx.participant.count({ where: { groupId } }),
    ]);
    return page(items, total, query);
  }
  create(data: Omit<Participant, 'createdAt' | 'updatedAt'>) {
    return this.tx.participant.create({ data });
  }
  update(
    groupId: string,
    id: string,
    data: Partial<Pick<Participant, 'name' | 'userId' | 'modality' | 'active'>>,
  ) {
    return this.tx.participant.update({
      where: { groupId_id: { groupId, id } },
      data,
    });
  }
}
