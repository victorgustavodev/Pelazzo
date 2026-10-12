import type { Match, Participation } from '../entities/match.js';
import type { Page, Paging } from '../../../../shared/domain/types.js';
export interface MatchRepository {
  find(groupId: string, id: string): Promise<Match | null>;
  list(groupId: string, query: Paging): Promise<Page<Match>>;
  create(data: Omit<Match, 'createdAt' | 'updatedAt'>): Promise<Match>;
  update(
    groupId: string,
    id: string,
    data: Partial<Pick<Match, 'title' | 'startsAt' | 'location' | 'status'>>,
  ): Promise<Match>;
}
export interface ParticipationRepository {
  find(groupId: string, id: string): Promise<Participation | null>;
  list(
    groupId: string,
    matchId: string,
    query: Paging,
  ): Promise<Page<Participation>>;
  create(
    data: Omit<Participation, 'createdAt' | 'updatedAt'>,
  ): Promise<Participation>;
  update(
    groupId: string,
    id: string,
    expectedAmountCents: number | null,
  ): Promise<Participation>;
  remove(groupId: string, id: string): Promise<void>;
}
