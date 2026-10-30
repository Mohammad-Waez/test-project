import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  Query,
} from '@nestjs/common';

import { AnnouncementService } from './announcement.service.js';
import { CreateAnnouncementDto } from './dto/create-announcement.dto.js';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto.js';

import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/index.js';
import { UserRole } from '../common/enums/index.js';
import type{ User } from '../generated/prisma/client.js';
import { AnnouncementQueryDto } from './dto/announcement.qouery.dto.js';

@Controller('announcement')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnnouncementController {
  constructor(
    private readonly announcementService: AnnouncementService,
  ) {}

 
  @Post()
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  create(@Body() dto: CreateAnnouncementDto,@CurrentUser() user: User) 
  {
    return this.announcementService.create(dto, user);
  }

  @Get()
  @Roles(UserRole.ADMIN,UserRole.TEACHER,UserRole.USER)
  findAll(
    @CurrentUser() user: User,
    @Query() query: AnnouncementQueryDto) 
    {
      return this.announcementService.findAll(user, query);
    }

  @Get(':id')
  @Roles(UserRole.ADMIN,UserRole.TEACHER,UserRole.USER)
  findOne(@Param('id', ParseIntPipe) id: number,@CurrentUser() user: User) 
  {
    return this.announcementService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  update(@Param('id', ParseIntPipe) id: number,@Body() dto: UpdateAnnouncementDto,@CurrentUser() user: User)
    {
    return this.announcementService.update(id, dto, user);
    }

 
  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  remove(@Param('id', ParseIntPipe) id: number,@CurrentUser() user: User)
     {
      return this.announcementService.remove(id, user);
     }
}