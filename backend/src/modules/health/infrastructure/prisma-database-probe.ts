import { Injectable } from '@nestjs/common';
import type { DatabaseProbe } from '../domain/services/database-probe.js';
import { PrismaService } from '../../../shared/database/prisma.service.js';

@Injectable()
export class PrismaDatabaseProbe implements DatabaseProbe {
  constructor(private readonly prisma: PrismaService) {}

  async isAvailable(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
