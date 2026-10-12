import type { Participant } from '../entities/participant.js';
import type { Page, Paging } from '../../../../shared/domain/types.js';
export interface ParticipantRepository {
  find(groupId: string, id: string): Promise<Participant | null>;
  list(groupId: string, query: Paging): Promise<Page<Participant>>;
  create(
    data: Omit<Participant, 'createdAt' | 'updatedAt'>,
  ): Promise<Participant>;
  update(
    groupId: string,
    id: string,
    data: Partial<Pick<Participant, 'name' | 'userId' | 'modality' | 'active'>>,
  ): Promise<Participant>;
}
