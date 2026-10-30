
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Cache } from 'cache-manager';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { User, UserRole } from '../generated/prisma/client.js';

@Injectable()
export class UserService {
  private readonly CACHE_TTL = 60_000;
  private readonly CACHE_VERSION_KEY = 'user:cache:version';

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  private async getCacheVersion(): Promise<number> {
    const version = await this.cacheManager.get<number>(
      this.CACHE_VERSION_KEY,
    );

    if (version === undefined || version === null) {
      await this.cacheManager.set(
        this.CACHE_VERSION_KEY,
        1,
        this.CACHE_TTL,
      );

      return 1;
    }

    return version;
  }

  private async invalidateUserCache(): Promise<void> {
    const version = await this.getCacheVersion();

    await this.cacheManager.set(
      this.CACHE_VERSION_KEY,
      version + 1,
      this.CACHE_TTL,
    );
  }

  async create(createUserDto: CreateUserDto) {
    try {
      const user = await this.prisma.user.create({
        data: createUserDto,
        select: {
          id: true,
          userName: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      await this.invalidateUserCache();

      return user;
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Username or email already exists',
        );
      }

      throw error;
    }
  }

  async findAll() {
    const version = await this.getCacheVersion();
    const cacheKey = `user:all:v${version}`;

    const cachedUsers = await this.cacheManager.get(cacheKey);

    if (cachedUsers !== undefined && cachedUsers !== null) {
      return cachedUsers;
    }

    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        userName: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.cacheManager.set(
      cacheKey,
      users,
      this.CACHE_TTL,
    );

    return users;
  }

  async findOne(id: number, userr: User) {
   
if(userr.role!=UserRole.ADMIN&&userr.id!=id){throw new ForbiddenException('You do not have permission to access this user');}


    const version = await this.getCacheVersion();
    const cacheKey = `user:one:v${version}:id:${id}`;

    const cachedUser = await this.cacheManager.get(cacheKey);

    if (cachedUser !== undefined && cachedUser !== null) {
      return cachedUser;
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        userName: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(
        `User with ID ${id} not found`,
      );
    }

    await this.cacheManager.set(
      cacheKey,
      user,
      this.CACHE_TTL,
    );

    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: updateUserDto,
        select: {
          id: true,
          userName: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      await this.invalidateUserCache();

      return user;
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(
          `User with ID ${id} not found`,
        );
      }

      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Username or email already exists',
        );
      }

      throw error;
    }
  }

  async remove(id: number) {
    try {
      const user = await this.prisma.user.delete({
        where: { id },
        select: {
          id: true,
          userName: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      await this.invalidateUserCache();

      return {
        message: 'User deleted successfully',
        user,
      };
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(
          `User with ID ${id} not found`,
        );
      }

      throw error;
    }
  }
}
