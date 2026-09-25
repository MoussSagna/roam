import { Global, Module } from '@nestjs/common';

import { PrismaService } from './prisma.service.js';

/** Provides the single `PrismaService` to every module (global: no need to import it per module). */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
