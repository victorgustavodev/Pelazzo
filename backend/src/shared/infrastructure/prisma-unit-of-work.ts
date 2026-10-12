import { PrismaService } from '../database/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import type { UnitOfWork, Repositories } from '../domain/unit-of-work.js';
import { BusinessError } from '../domain/errors.js';
import {
  PrismaGroupRepository,
  PrismaMembershipRepository,
  PrismaInvitationRepository,
  PrismaPixRepository,
  PrismaAuditRepository,
} from '../../modules/groups/infrastructure/repositories/prisma-groups.repositories.js';
import { PrismaParticipantRepository } from '../../modules/participants/infrastructure/repositories/prisma-participant.repository.js';
import { PrismaAttendanceLinkRepository } from '../../modules/matches/infrastructure/repositories/prisma-attendance.repository.js';
import {
  PrismaMatchRepository,
  PrismaParticipationRepository,
} from '../../modules/matches/infrastructure/repositories/prisma-matches.repositories.js';
import {
  PrismaPaymentRepository,
  PrismaExpenseRepository,
} from '../../modules/finance/infrastructure/repositories/prisma-finance.repositories.js';
export class PrismaUnitOfWork implements UnitOfWork {
  constructor(private readonly prisma: PrismaService) {}
  async run<T>(
    operation: (repositories: Repositories) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.prisma.$transaction(
        (tx) =>
          operation({
            groups: new PrismaGroupRepository(tx),
            members: new PrismaMembershipRepository(tx),
            invitations: new PrismaInvitationRepository(tx),
            pix: new PrismaPixRepository(tx),
            audit: new PrismaAuditRepository(tx),
            participants: new PrismaParticipantRepository(tx),
            matches: new PrismaMatchRepository(tx),
            participations: new PrismaParticipationRepository(tx),
            attendanceLinks: new PrismaAttendanceLinkRepository(tx),
            payments: new PrismaPaymentRepository(tx),
            expenses: new PrismaExpenseRepository(tx),
          }),
        { maxWait: 5000, timeout: 15000 },
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002')
          throw new BusinessError(
            'CONFLICT',
            'Registro ou chave de operação já existente.',
          );
        if (error.code === 'P2003')
          throw new BusinessError(
            'CONFLICT',
            'Vínculo inválido ou registro com histórico.',
          );
        if (error.code === 'P2025')
          throw new BusinessError('NOT_FOUND', 'Registro não encontrado.');
      }
      throw error;
    }
  }
}
