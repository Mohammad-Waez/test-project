import { Module } from '@nestjs/common';
import { ProgramSessionService } from './program-session.service.js';
import { ProgramSessionController } from './program-session.controller.js';
import { CacheModule } from '@nestjs/cache-manager';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [
    PrismaModule,
    CacheModule.register(),
  ],
  controllers: [ProgramSessionController],
  providers: [ProgramSessionService],
})
export class ProgramSessionModule {}
