import type { Prisma } from '../../../../generated/prisma/client.js';
import type { AttendanceLinkRepository } from '../../domain/repositories/attendance.repository.js';
import type { AttendanceLink } from '../../domain/entities/attendance.js';
export class PrismaAttendanceLinkRepository implements AttendanceLinkRepository {
  constructor(private readonly tx: Prisma.TransactionClient) {}
  findForMatch(groupId: string, matchId: string) {
    return this.tx.matchAttendanceLink.findUnique({
      where: { groupId_matchId: { groupId, matchId } },
    });
  }
  findByHash(tokenHash: string) {
    return this.tx.matchAttendanceLink.findUnique({ where: { tokenHash } });
  }
  save(data: Omit<AttendanceLink, 'createdAt' | 'updatedAt'>) {
    return this.tx.matchAttendanceLink.upsert({
      where: {
        groupId_matchId: { groupId: data.groupId, matchId: data.matchId },
      },
      create: data,
      update: {
        tokenHash: data.tokenHash,
        createdBy: data.createdBy,
        revokedAt: data.revokedAt,
        expiresAt: data.expiresAt,
      },
    });
  }
  async revoke(groupId: string, matchId: string, at: Date) {
    await this.tx.matchAttendanceLink.update({
      where: { groupId_matchId: { groupId, matchId } },
      data: { revokedAt: at },
    });
  }
}
