import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { UserModule } from './user/user.module.js';
import { ProgramModule } from './program/program.module.js';
import { EnrolllmentModule } from './enrolllment/enrolllment.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma/prisma.service.js';
import { ProgramSessionModule } from './program-session/program-session.module.js';
import { CacheModule } from '@nestjs/cache-manager';
export const { ObserveModule, ObserveInstrument } = createObserveModule();
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AnnouncementModule } from './announcement/announcement.module.js';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 5,
      },
    ]),

    CacheModule.register({ ttl: 60000 }),

    AuthModule,

    UserModule,

    PrismaModule,

    UserModule,

    ProgramModule,

    EnrolllmentModule,

    ProgramSessionModule,

    AnnouncementModule,
  ],
  controllers: [],
  providers: [PrismaService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
