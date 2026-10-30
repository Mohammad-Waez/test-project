import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateProgramDto } from './dto/create-program.dto.js';
import { UpdateProgramDto } from './dto/update-program.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { basename, resolve } from 'path';
import { unlink } from 'fs/promises';

import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { User } from '../generated/prisma/client.js';
import { UserRole } from '../common/enums/index.js';
import { PaginationSortDto } from './dto/pagination.sorting.dto.js';

@Injectable()
export class ProgramService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  private readonly cacheTtl = 60_000;
  private readonly cacheVersionKey = 'program:cache:version';

  private async getCacheVersion(): Promise<number> {
    const version = await this.cacheManager.get<number>(
      this.cacheVersionKey,
    );

    return version ?? 1;
  }

  private async invalidateProgramCache(): Promise<void> {
    const version = await this.getCacheVersion();

    await this.cacheManager.set(
      this.cacheVersionKey,
      version + 1,
    );
  }


async create(
  createProgramDto: CreateProgramDto,
  user: User,
  file?: Express.Multer.File,
) {
  // 1. Check user permissions
  if (
    user.role !== UserRole.TEACHER &&
    user.role !== UserRole.ADMIN
  ) {
    throw new ForbiddenException(
      'You are not allowed to create a program',
    );
  }

  // 2. Determine teacher ID
  const teacherId =
    user.role === UserRole.TEACHER
      ? user.id
      : createProgramDto.teacherId;

  // 3. Validate teacher ID
  if (!teacherId) {
    throw new BadRequestException(
      'Teacher ID is required',
    );
  }

  // 4. Check if teacher exists and has TEACHER role
  const teacher = await this.prisma.user.findFirst({
    where: {
      id: teacherId,
      role: UserRole.TEACHER,
    },
    select: {
      id: true,
    },
  });

  if (!teacher) {
    throw new NotFoundException(
      'Teacher not found',
    );
  }

  // 5. Create program
  const program = await this.prisma.program.create({
    data: {
      name: createProgramDto.name,
      description: createProgramDto.description,
      teacherId: teacher.id,
      imageUrl: file?.filename ?? null,
    },
  });

  // 6. Invalidate cache
  await this.invalidateProgramCache();

  return program;
}



  async findAll(dto: PaginationSortDto) {
    const { page, limit, sortBy, order } = dto;

    const version = await this.getCacheVersion();

    // مفتاح مستقل لكل صفحة وترتيب
    const cacheKey =
      `program:all:v${version}:page:${page}:limit:${limit}:sortBy:${sortBy}:order:${order}`;

    const cached = await this.cacheManager.get(cacheKey);

    // Cache Hit
    if (cached !== undefined && cached !== null) {
      return cached;
    }

    // Cache Miss
    const skip = (page - 1) * limit;

    const [programs, total] = await Promise.all([
      this.prisma.program.findMany({
        skip,
        take: limit,
        orderBy: {
          [sortBy]: order,
        },
        include: {
          teacher: {
            select: {
              userName: true,
            },
          },
        },
      }),

      this.prisma.program.count(),
    ]);

    const result = {
      data: programs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    await this.cacheManager.set(
      cacheKey,
      result,
      this.cacheTtl,
    );

    return result;
  }

  async findOne(id: number, user: User) {
    const version = await this.getCacheVersion();

    const cacheKey = `program:one:v${version}:id:${id}`;

    // Cache Hit
    const cached = await this.cacheManager.get(cacheKey);

    if (cached !== undefined && cached !== null) {
      return cached;
    }

    // Cache Miss
    const program = await this.prisma.program.findFirst({
      where: { id },
      include: {
        teacher: {
          select: {
            userName: true,
          },
        },
      },
    });

    // لا نخزن النتائج غير الموجودة
    if (program !== null) {
      await this.cacheManager.set(
        cacheKey,
        program,
        this.cacheTtl,
      );
    }

    return program;
  }

   async update(id: number,user:User,dto: UpdateProgramDto,file?: Express.Multer.File) 
   {
    const existingProgram = await this.prisma.program.findUnique({
      where: { id },
    });

    if (!existingProgram) {
      if (file) {
        await this.removeImage(this.getImageUrl(file)).catch(
          () => undefined,
        );
      }

      throw new NotFoundException('Program not found');
    }

     if(user.role !== UserRole.ADMIN && user.id !== existingProgram.teacherId)
    {
      throw new ForbiddenException('You are not authorized to update this Program');
    }


    const newImageUrl = this.getImageUrl(file);
    let updatedProgram;

    try {
      if (dto.capacity !== undefined) {
        const occupiedSeats =
        existingProgram.capacity - existingProgram.availalbeSeats;
        
        if (dto.capacity < occupiedSeats) {
    
          throw new BadRequestException
          (`Capacity cannot be less than occupied seats (${occupiedSeats})`,
    )}}

       updatedProgram = await this.prisma.program.update({
        where: { id },
        data: { 
          ...(dto.name !== undefined && { title: dto.name }),
          ...(dto.description !== undefined && {description: dto.description}),
          ...(dto.capacity !== undefined && {capacity: dto.capacity,
            // Keep already occupied seats occupied.
            availableSeats: dto.capacity - (existingProgram.capacity - existingProgram.availalbeSeats) 
           }),
          ...(newImageUrl && { imageUrl: newImageUrl }),
       },
        include: {
          teacher: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

    } catch (error) {
      // If updating fails, remove the newly uploaded image.
      if (newImageUrl) {
        await this.removeImage(newImageUrl).catch(() => undefined);
      }

      throw error;
    }

    if (newImageUrl && existingProgram.imageUrl) {
        await this.removeImage(existingProgram.imageUrl);
      }



      await this.cacheManager.del(`program:${id}`);
      return updatedProgram;
    
  }

  async remove(id: number, user: User) {
    const programExists = await this.prisma.program.findUnique({
      where: { id },
    });

    if (!programExists) {
      throw new NotFoundException('Program is not exists');
    }

    if (user.role === UserRole.ADMIN) {
      const program = await this.prisma.program.delete({
        where: { id },
      });

      await this.invalidateProgramCache();

      return program;
    }

    throw new ForbiddenException(
      'You are not allowed to delete this program',
    );
  }

 private getImageUrl(file?: Express.Multer.File): string | null {
    if (!file) return null;
    return `/uploads/programs/${file.filename}`;
  }

  private async removeImage(imageUrl?: string | null): Promise<void> {
    
    if (!imageUrl?.startsWith('/uploads/programs/')) return;

    const filename = basename(imageUrl);
    if (!filename || filename === '.' || filename === '..') return;

    const imagePath = resolve(
      process.cwd(),
      'uploads',
      'programs',
      filename,
    );

    try {
      await unlink(imagePath);
    } catch (error) {
      // The image may already have been deleted.
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        return;
      }

      throw error;
    }
  }


}



