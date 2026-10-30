import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateAnnouncementDto } from './dto/create-announcement.dto.js';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';

import { Prisma, User } from '../generated/prisma/client.js';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { AnnouncementQueryDto } from './dto/announcement.qouery.dto.js';
import { UserRole } from '../common/enums/index.js';

@Injectable()
export class AnnouncementService {
  constructor(private readonly prisma:PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache ,
  ){}

  async create(dto: CreateAnnouncementDto,user: User)
  {
    let programId = dto.programId;

    if (programId !== undefined && programId !== null) {
      await this.checkProgramAccess(programId, user);
    } 
    
    else if (!this.isAdmin(user) && programId ===undefined ) {
      throw new ForbiddenException(
        'Only admins can create general announcements',
      );
    }

    const isPublished = dto.isPublished ?? false;

    const newannouncement = await this.prisma.announcement.create({
      data: {
        title: dto.title,
        content: dto.content,
        programId: programId ?? null,
        authorId: user.id,
        isPublished,
        publishedAt: isPublished ? new Date() : null,
      },
    });
    await this.cache.clear();

    return newannouncement;

  }

  async findAll(user: User, query: AnnouncementQueryDto) {
  const {
    page = 1,
    limit = 10,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    isPublished,
  } = query;

  let accessWhere: Prisma.AnnouncementWhereInput = {};

  if (this.isAdmin(user)) {
    accessWhere = {};
  } 
  else if (user.role === UserRole.TEACHER) {
    accessWhere = {
      OR: [
        {
          programId: null,
          isPublished: true,
        },
        {
          program: {
            teacherId: user.id,
          },
        },
      ],
    };
  } else if (user.role === UserRole.USER) {
    accessWhere = {
      isPublished: true,
      OR: [
        { programId: null },
        {
          program: {
            enrollments: {
              some: {
                userId: user.id,
                enrolmentStatus: "ACCEPTED",
              },
            },
          },
        },
      ],
    };
  } else {
    throw new ForbiddenException('You cannot view announcements');
  }

  const normalizedSearch = search?.trim() ?? '';

  const cacheKey = `announcements:list:${JSON.stringify({
    role: user.role,
    userId: user.id,
    page,
    limit,
    search: normalizedSearch,
    sortBy,
    sortOrder,
    isPublished:user.role === UserRole.USER ? undefined : isPublished,
  })}`;

  const cached = await this.cache.get<any>(cacheKey);

  if (cached !== undefined && cached !== null) {
    return cached;
  }

  const conditions: Prisma.AnnouncementWhereInput[] = [accessWhere];

  if (normalizedSearch) {
    conditions.push({
      OR: [
        {
          title: {
            contains: normalizedSearch,
            mode: 'insensitive',
          },
        },
        {
          content: {
            contains: normalizedSearch,
            mode: 'insensitive',
          },
        },
      ],
    });
  }

  if (isPublished !== undefined && user.role !== UserRole.USER) {
    conditions.push({ isPublished });
  }

  const where: Prisma.AnnouncementWhereInput = {
    AND: conditions,
  };

  const skip = (page - 1) * limit;

  const [data, total] = await this.prisma.$transaction([
    this.prisma.announcement.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        program: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    }),
    this.prisma.announcement.count({ where }),
  ]);

  const result = {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
    },
  };

  await this.cache.set(cacheKey, result, 10_000);

  return result;
}

  async findOne(id: number, user: User) {
  const key = `announcement:${id}`;

  let announcement = await this.cache.get<any>(key);

  if (announcement === undefined || announcement === null) {
    announcement = await this.prisma.announcement.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        program: {
          select: {
            id: true,
            title: true,
            supervisorId: true,
          },
        },
      },
    });

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    await this.cache.set(key, announcement, 10_000);
  }

  if (this.isAdmin(user)) {
    return announcement;
  }

  if (announcement.programId === null) {
    if (announcement.isPublished) {
      return announcement;
    }

    throw new NotFoundException('Announcement not found');
  }

  if (
    user.role === UserRole.TEACHER &&
    announcement.program?.supervisorId === user.id
  ) {
    return announcement;
  }

  if (
    user.role === UserRole.USER &&
    announcement.isPublished &&
    await this.checkStudentEnrollment(announcement.programId,user.id)
  ) 
  {
    return announcement;
  }

  throw new NotFoundException('Announcement not found');
}

   async update(id: number,dto: UpdateAnnouncementDto,user: User)
    {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id },
    });

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    if (!this.isAdmin(user)) {
      if (user.role !== UserRole.TEACHER ||
          announcement.programId === null ||
          announcement.authorId !== user.id
      ) {
        throw new ForbiddenException(
          'You cannot update this announcement',
        );
      }

      await this.checkProgramAccess(announcement.programId, user);
    }

    const isPublished = dto.isPublished ?? announcement.isPublished;

    let publishedAt = announcement.publishedAt;

    if (dto.isPublished === true && !announcement.isPublished) {
      publishedAt = new Date();
    } 

    else if (dto.isPublished === false) {
      publishedAt = null;
    }


    const updateannouncement=await this.prisma.announcement.update({
      where: { id },
      data: {
        title: dto.title,
        content: dto.content,
        isPublished,
        publishedAt,
      },
    });
        
    await this.cache.del(`announcement:${id}`);

    return updateannouncement;
  }

  async remove(id: number, user: User) {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id },
    });

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    if (!this.isAdmin(user)) {
      if (
        user.role !== UserRole.TEACHER ||
        announcement.programId === null ||
        announcement.authorId !== user.id
      ) {
        throw new ForbiddenException(
          'You cannot delete this announcement',
        );
      }

      await this.checkProgramAccess(announcement.programId, user);
    }

    const deleteannouncement=await this.prisma.announcement.delete({
      where: { id },
    });
    await this.cache.del(`announcement:${id}`);
 
    return deleteannouncement;

  }




   private isAdmin(user: User): boolean {
    return user.role === UserRole.ADMIN;
  }

   private async checkProgramAccess(programId: number,user: User)
  {
    const program = await this.prisma.program.findUnique({
      where: { id: programId },
    });

    if (!program) {
      throw new NotFoundException('Program not found');
    }

    if (this.isAdmin(user)) {
      return program;
    }

    if (
      user.role === UserRole.TEACHER &&
      program.teacherId === user.id
    ) {
      return program;
    }

    throw new ForbiddenException(
      'You cannot manage announcements for this program',
    );
  }

  private async checkStudentEnrollment(programId: number,userId: number): Promise<boolean> 
  {
    const application = await this.prisma.enrollment.findFirst({
      where: {
        programId,
        studentId: userId,
        status: 'ACCEPTED',
      },
    });

    return !!application;
  }
} 