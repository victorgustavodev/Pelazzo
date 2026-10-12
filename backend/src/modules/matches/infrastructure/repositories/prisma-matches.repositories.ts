import type { Prisma } from '../../../../generated/prisma/client.js';
import type {
  MatchRepository,
  ParticipationRepository,
} from '../../domain/repositories/matches.repositories.js';
import type { Match, Participation } from '../../domain/entities/match.js';
import type { Paging } from '../../../../shared/domain/types.js';
import { slice, page } from '../../../../shared/infrastructure/page.js';
export class PrismaMatchRepository implements MatchRepository {
  constructor(private readonly tx: Prisma.TransactionClient) {}
  find(groupId: string, id: string) {
    return this.tx.match.findFirst({ where: { groupId, id } });
  }
  async list(groupId: string, query: Paging) {
    const [items, total] = await Promise.all([
      this.tx.match.findMany({
        where: { groupId },
        ...slice(query),
        orderBy: [{ startsAt: 'desc' }, { id: 'asc' }],
      }),
      this.tx.match.count({ where: { groupId } }),
    ]);
    return page(items, total, query);
  }
  create(data: Omit<Match, 'createdAt' | 'updatedAt'>) {
    return this.tx.match.create({ data });
  }
  update(
    groupId: string,
    id: string,
    data: Partial<Pick<Match, 'title' | 'startsAt' | 'location' | 'status'>>,
  ) {
    return this.tx.match.update({
      where: { groupId_id: { groupId, id } },
      data,
    });
  }
}
export class PrismaParticipationRepository implements ParticipationRepository {
  constructor(private readonly tx: Prisma.TransactionClient) {}
  find(groupId: string, id: string) {
    return this.tx.matchParticipant.findFirst({ where: { groupId, id } });
  }
  async list(groupId: string, matchId: string, query: Paging) {
    const where = { groupId, matchId };
    const [items, total] = await Promise.all([
      this.tx.matchParticipant.findMany({
        where,
        ...slice(query),
        orderBy: { id: 'asc' },
      }),
      this.tx.matchParticipant.count({ where }),
    ]);
    return page(items, total, query);
  }
  create(data: Omit<Participation, 'createdAt' | 'updatedAt'>) {
    return this.tx.matchParticipant.create({ data });
  }
  update(groupId: string, id: string, expectedAmountCents: number | null) {
    return this.tx.matchParticipant.update({
      where: { id, groupId },
      data: { expectedAmountCents },
    });
  }
  async remove(groupId: string, id: string) {
    await this.tx.matchParticipant.delete({ where: { id, groupId } });
  }
}
