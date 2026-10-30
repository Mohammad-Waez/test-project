
import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

import { CreateProgramSessionDto } from './dto/create-program-session.dto.js';
import { UpdateProgramSessionDto } from './dto/update-program-session.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UserRole } from '../generated/prisma/enums.js';

@Injectable()
export class ProgramSessionService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  private readonly cacheTtl = 60_000;
  private readonly cacheVersionKey = 'program-session:cache:version';

  private async getCacheVersion(): Promise<number> {
    const version = await this.cacheManager.get<number>(
      this.cacheVersionKey,
    );

    return version ?? 1;
  }

  private async invalidateSessionCache(): Promise<void> {
    const version = await this.getCacheVersion();

    await this.cacheManager.set(
      this.cacheVersionKey,
      version + 1,
    );
  }

  async create(createProgramSessionDto: CreateProgramSessionDto) {
    const { programId, ...sessionData } = createProgramSessionDto;

    const session = await this.prisma.programSession.create({
      data: {
        ...sessionData,
        program: {
          connect: {
            id: programId,
          },
        },
      },
    });

    await this.invalidateSessionCache();

    return session;
  }

  async findAll() {
    const version = await this.getCacheVersion();
    const cacheKey = `program-session:all:v${version}`;

    // Cache Hit
    const cached = await this.cacheManager.get(cacheKey);

    if (cached !== undefined && cached !== null) {
      return cached;
    }

    // Cache Miss
    const sessions = await this.prisma.programSession.findMany();

    await this.cacheManager.set(
      cacheKey,
      sessions,
      this.cacheTtl,
    );

    return sessions;
  }

  async findOne(id: number) {
    const version = await this.getCacheVersion();
    const cacheKey = `program-session:one:v${version}:id:${id}`;

    // Cache Hit
    const cached = await this.cacheManager.get(cacheKey);

    if (cached !== undefined && cached !== null) {
      return cached;
    }

    // Cache Miss
    const session = await this.prisma.programSession.findUnique({
      where: { id },
    });

    if (!session) {
      throw new NotFoundException(
        `Program session with ID ${id} not found`,
      );
    }

    await this.cacheManager.set(
      cacheKey,
      session,
      this.cacheTtl,
    );

    return session;
  }

  async update(
    id: number,
    dto: UpdateProgramSessionDto,
    user: { id: number; role: UserRole },
  ) {
    await this.checkSessionPermission(id, user);

    const data = {
      ...dto,
      ...(dto.startTime && {
        startTime: new Date(dto.startTime),
      }),
      ...(dto.endTime && {
        endTime: new Date(dto.endTime),
      }),
    };

    const session = await this.prisma.programSession.update({
      where: { id },
      data,
    });

    await this.invalidateSessionCache();

    return session;
  }

  async remove(
    id: number,
    user: { id: number; role: UserRole },
  ) {
    await this.checkSessionPermission(id, user);

    const session = await this.prisma.programSession.delete({
      where: { id },
    });

    await this.invalidateSessionCache();

    return session;
  }

  private async checkSessionPermission(
    id: number,
    user: { id: number; role: UserRole },
  ) {
    const session = await this.prisma.programSession.findUnique({
      where: { id },
      include: {
        program: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (user.role === UserRole.ADMIN) {
      return session;
    }

    if (
      user.role === UserRole.TEACHER &&
      session.program.teacherId === user.id
    ) {
      return session;
    }

    throw new ForbiddenException(
      'You are not allowed to manage this session',
    );
  }
}
