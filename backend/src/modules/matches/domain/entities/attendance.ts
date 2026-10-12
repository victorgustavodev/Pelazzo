import { text } from '../../../../shared/domain/validation.js';
export interface AttendanceLink {
  id: string;
  groupId: string;
  matchId: string;
  tokenHash: string;
  expiresAt: Date;
  createdBy: string;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
export function attendanceName(value: string) {
  return text(value, 'Nome', 1, 120).normalize('NFC').replace(/\s+/gu, ' ');
}
