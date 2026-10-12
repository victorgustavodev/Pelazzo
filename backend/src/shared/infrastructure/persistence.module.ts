import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { PrismaService } from '../database/prisma.service.js';
import { UNIT_OF_WORK } from '../domain/unit-of-work.js';
import { RUNTIME } from '../domain/types.js';
import { PrismaUnitOfWork } from './prisma-unit-of-work.js';
import { SystemRuntime } from './system-runtime.js';
@Global()
@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: UNIT_OF_WORK,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) => new PrismaUnitOfWork(prisma),
    },
    { provide: RUNTIME, useClass: SystemRuntime },
  ],
  exports: [UNIT_OF_WORK, RUNTIME],
})
export class PersistenceModule {}
