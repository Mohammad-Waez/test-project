
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

import { CreateEnrolllmentDto } from './dto/create-enrolllment.dto.js';
import { UpdateEnrolllmentDto } from './dto/update-enrolllment.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { User, UserRole } from '../generated/prisma/client.js';
import { EnrollmentStatus } from '../common/enums/index.js';

@Injectable()
export class EnrolllmentService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  private readonly cacheTtl = 60_000;

  // Versioning: إبطال جميع مفاتيح كاش التسجيلات دون الحاجة
  // إلى معرفة كل المفاتيح المخزنة مسبقًا.
  private readonly cacheVersionKey = 'enrollment:cache:version';

  private async getCacheVersion(): Promise<number> {
    const version = await this.cacheManager.get<number>(
      this.cacheVersionKey,
    );

    return version ?? 1;
  }

  private async invalidateEnrollmentCache(): Promise<void> {
    const version = await this.getCacheVersion();

    await this.cacheManager.set(
      this.cacheVersionKey,
      version + 1,
    );
  }

  async create(
    createEnrollmentDto: CreateEnrolllmentDto,
    user: { id: number; role: UserRole },
  ) {
    const enrollment = await this.prisma.$transaction(async (tx) => {
      // 1. التأكد من وجود الكورس وحجز مقعد
      const program = await tx.program.updateMany({
        where: {
          id: createEnrollmentDto.programId,
          availableSeats: { gt: 0 },
        },
        data: {
          availableSeats: { decrement: 1 },
        },
      });

      // 2. إذا لم يتوفر مقعد
      if (program.count === 0) {
        throw new ConflictException('No seats available');
      }

      // 3. إنشاء التسجيل
      return tx.enrollment.create({
        data: {
          ...createEnrollmentDto,
          userId: user.id,
        },
      });
    });

    await this.invalidateEnrollmentCache();

    return enrollment;
  }

  async findAll(user: User) {
    const version = await this.getCacheVersion();

    // فصل الكاش حسب الدور والمستخدم لضمان عدم اختلاط الصلاحيات
    const cacheKey =
      `enrollment:all:v${version}:role:${user.role}:user:${user.id}`;

    const cached = await this.cacheManager.get<
      Awaited<ReturnType<PrismaService['enrollment']['findMany']>>
    >(cacheKey);

    // Cache Hit
    if (cached !== undefined && cached !== null) {
      return cached;
    }

    // Cache Miss
    let result;

    if (user.role === UserRole.ADMIN) {
      result = await this.prisma.enrollment.findMany({
        include: {
          user: { select: { userName: true } },
          program: { select: { name: true } },
        },
      });
    } else if (user.role === UserRole.USER) {
      result = await this.prisma.enrollment.findMany({
        where: { userId: user.id },
        include: {
          user: { select: { userName: true } },
          program: { select: { name: true } },
        },
      });
    } else if (user.role === UserRole.TEACHER) {
      result = await this.prisma.enrollment.findMany({
        where: { program: { teacherId: user.id } },
        include: {
          user: { select: { userName: true } },
          program: { select: { name: true } },
        },
      });
    } else {
      return undefined;
    }

    await this.cacheManager.set(
      cacheKey,
      result,
      this.cacheTtl,
    );

    return result;
  }

  async findOne(id: number, user: User) {
    const version = await this.getCacheVersion();

    // كل مستخدم ودور له مفتاح مستقل
    const cacheKey =
      `enrollment:one:v${version}:id:${id}:role:${user.role}:user:${user.id}`;

    const cached = await this.cacheManager.get(cacheKey);

    // Cache Hit
    if (cached !== undefined && cached !== null) {
      return cached;
    }

    // Cache Miss
    let result;

    if (user.role === UserRole.USER) {
      result = await this.prisma.enrollment.findUnique({
        where: {
          id,
          userId: user.id,
        },
        include: {
          user: { select: { userName: true } },
          program: { select: { name: true } },
        },
      });
    } else if (user.role === UserRole.TEACHER) {
      result = await this.prisma.enrollment.findUnique({
        where: {
          id,
          program: { teacherId: user.id },
        },
        include: {
          user: { select: { userName: true } },
          program: { select: { name: true } },
        },
      });
    } else {
      result = await this.prisma.enrollment.findUnique({
        where: { id },
        include: {
          user: { select: { userName: true } },
          program: { select: { name: true } },
        },
      });
    }

    // نخزن النتائج الموجودة فقط، ولا نخزن null
    if (result !== null) {
      await this.cacheManager.set(
        cacheKey,
        result,
        this.cacheTtl,
      );
    }

    return result;
  }

  // الأدمن فقط يستطيع تعديل حالة التسجيل
  async update(
    id: number,
    updateEnrollmentDto: UpdateEnrolllmentDto,
    user: User,
  ) {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Only admin can update enrollment status',
      );
    }

    const enrollment = await this.prisma.$transaction(async (tx) => {
      // جلب طلب التسجيل
      const enrollment = await tx.enrollment.findUnique({
        where: { id },
      });

      if (!enrollment) {
        throw new NotFoundException('Enrollment not found');
      }

      // منع معالجة الطلب أكثر من مرة
      if (
        enrollment.enrolmentStatus !== EnrollmentStatus.PENDING
      ) {
        throw new ConflictException(
          'Enrollment already processed',
        );
      }

      const { enrolmentStatus } = updateEnrollmentDto;

      if (
        enrolmentStatus !== EnrollmentStatus.ACCEPTED &&
        enrolmentStatus !== EnrollmentStatus.REJECTED
      ) {
        throw new BadRequestException(
          'Status must be ACCEPTED or REJECTED',
        );
      }

      // إذا رفض الأدمن الطلب، نعيد المقعد
      if (enrolmentStatus === EnrollmentStatus.REJECTED) {
        await tx.program.update({
          where: { id: enrollment.programId },
          data: {
            availableSeats: { increment: 1 },
          },
        });
      }

      // تحديث حالة الطلب
      return tx.enrollment.update({
        where: { id },
        data: { enrolmentStatus },
      });
    });

    await this.invalidateEnrollmentCache();

    return enrollment;
  }

  async remove(id: number, user: User) {
    const result = await this.prisma.$transaction(async (tx) => {
      const enrollment = await tx.enrollment.findUnique({
        where: { id },
      });

      if (!enrollment) {
        throw new NotFoundException('Enrollment not found');
      }

      // الطالب يسحب تسجيله هو فقط
      if (enrollment.userId !== user.id) {
        throw new ForbiddenException(
          'You can only withdraw your own enrollment',
        );
      }

      // السحب مسموح فقط للحالات المحددة
      if (
        enrollment.enrolmentStatus !== EnrollmentStatus.PENDING &&
        enrollment.enrolmentStatus !== EnrollmentStatus.ACCEPTED
      ) {
        throw new ConflictException(
          'Only pending or approved enrollments can be withdrawn',
        );
      }

      // تغيير الحالة بشكل شرطي لمنع السحب مرتين
      const updateResult = await tx.enrollment.updateMany({
        where: {
          id,
          userId: user.id,
          enrolmentStatus: {
            in: [
              EnrollmentStatus.PENDING,
              EnrollmentStatus.ACCEPTED,
            ],
          },
        },
        data: {
          enrolmentStatus: EnrollmentStatus.WITHDRAWN,
        },
      });

      if (updateResult.count === 0) {
        throw new ConflictException(
          'Enrollment already processed',
        );
      }

      // إعادة المقعد المتاح
      await tx.program.update({
        where: { id: enrollment.programId },
        data: {
          availableSeats: { increment: 1 },
        },
      });

      return {
        message: 'Enrollment withdrawn successfully',
      };
    });

    await this.invalidateEnrollmentCache();

    return result;
  }
}
