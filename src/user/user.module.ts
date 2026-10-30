import { Module } from '@nestjs/common';
import { UserService } from './user.service.js';
import { UserController } from './user.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    CacheModule.register(),
    PrismaModule,
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
