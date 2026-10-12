import type { AttendanceLink } from '../entities/attendance.js';
export interface AttendanceLinkRepository {
  findForMatch(
    groupId: string,
    matchId: string,
  ): Promise<AttendanceLink | null>;
  findByHash(hash: string): Promise<AttendanceLink | null>;
  save(
    data: Omit<AttendanceLink, 'createdAt' | 'updatedAt'>,
  ): Promise<AttendanceLink>;
  revoke(groupId: string, matchId: string, at: Date): Promise<void>;
}
