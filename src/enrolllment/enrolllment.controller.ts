import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { EnrolllmentService } from './enrolllment.service.js';
import { CreateEnrolllmentDto } from './dto/create-enrolllment.dto.js';
import { UpdateEnrolllmentDto } from './dto/update-enrolllment.dto.js';
import { CurrentUser } from '../common/decorators/index.js';

import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';

import { RolesGuard } from '../common/guards/roles.guard.js';
import { UserRole } from '../common/enums/index.js';
import type { User } from '../generated/prisma/client.js';
@UseGuards(JwtAuthGuard)
@Controller('enrolllment')
export class EnrolllmentController {
  constructor(private readonly enrolllmentService: EnrolllmentService) {}

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.USER)
  @Post()
  create(
    @Body() createEnrolllmentDto: CreateEnrolllmentDto,
    @CurrentUser() user: { id: number; role: UserRole },
  ) {
    return this.enrolllmentService.create(createEnrolllmentDto, user);
  }
 @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER,UserRole.USER)
  @Get()
  findAll(@CurrentUser() user: User) {
    return this.enrolllmentService.findAll(user);
  }
 @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER,UserRole.USER)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.enrolllmentService.findOne(+id, user);
  }
@UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateEnrolllmentDto: UpdateEnrolllmentDto,
    @CurrentUser() user: User,
  ) {
    return this.enrolllmentService.update(+id, updateEnrolllmentDto, user);
  }
@UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN,UserRole.USER)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.enrolllmentService.remove(+id, user);
  }
}
