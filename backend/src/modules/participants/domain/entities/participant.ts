export type Modality = 'MONTHLY' | 'DAILY';
export interface Participant {
  id: string;
  groupId: string;
  userId: string | null;
  name: string;
  modality: Modality;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
