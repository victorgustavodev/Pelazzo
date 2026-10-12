import type { Modality } from '../../../participants/domain/entities/participant.js';
export type MatchStatus = 'SCHEDULED' | 'FINISHED' | 'CANCELED';
export interface Match {
  id: string;
  groupId: string;
  title: string;
  startsAt: Date;
  location: string | null;
  status: MatchStatus;
  createdAt: Date;
  updatedAt: Date;
}
export interface Participation {
  id: string;
  groupId: string;
  matchId: string;
  participantId: string;
  modalitySnapshot: Modality;
  expectedAmountCents: number | null;
  createdAt: Date;
  updatedAt: Date;
}
