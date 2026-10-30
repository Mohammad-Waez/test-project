import { Module } from '@nestjs/common';
import { ProgramService } from './program.service.js';
import { ProgramController } from './program.controller.js';
import { CacheModule } from '@nestjs/cache-manager';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
   imports: [
    PrismaModule,
    CacheModule.register(),
  ],
  controllers: [ProgramController],
  providers: [ProgramService],
})
export class ProgramModule {}
