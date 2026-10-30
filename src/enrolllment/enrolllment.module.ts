import { Module } from '@nestjs/common';
import { EnrolllmentService } from './enrolllment.service.js';
import { EnrolllmentController } from './enrolllment.controller.js';
import { CacheModule } from '@nestjs/cache-manager';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
    imports: [
    PrismaModule,
    CacheModule.register(),
  ],
  controllers: [EnrolllmentController],
  providers: [EnrolllmentService],
})
export class EnrolllmentModule {}
