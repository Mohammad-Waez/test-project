import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, ParseIntPipe } from '@nestjs/common';
import { ProgramService } from './program.service.js';
import { CreateProgramDto } from './dto/create-program.dto.js';
import { UpdateProgramDto } from './dto/update-program.dto.js';
import { CurrentUser } from '../common/decorators/index.js';
import type{ User } from '../generated/prisma/client.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../common/enums/index.js';
import { PaginationSortDto } from './dto/pagination.sorting.dto.js';
import type { Express } from 'express';
import {
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import { programMulterOptions } from './program.multer.js';



@Controller('program')
export class ProgramController {
  constructor(private readonly programService: ProgramService) {}


@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.TEACHER)
@Post()
@UseInterceptors(FileInterceptor('image', programMulterOptions))
  create(@Body() dto: CreateProgramDto,@CurrentUser() currentUser: User,
    @UploadedFile() file?: Express.Multer.File) 
  {
    return this.programService.create(dto, currentUser, file);
  }


 @Get()
findAll(@Query() dto: PaginationSortDto) {
  return this.programService.findAll(dto);
}

  @Get(':id')
  findOne(@Param('id') id: string,@CurrentUser() user:User) {
    return this.programService.findOne(+id,user);
  }


@UseGuards(JwtAuthGuard)
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN,UserRole.TEACHER)


  @Patch(':id')
  @UseInterceptors(FileInterceptor('image', programMulterOptions))
   update(@Param('id', ParseIntPipe) id: number,@CurrentUser() user: User,
    @Body() dto: UpdateProgramDto,
    @UploadedFile() file?: Express.Multer.File) {
    return this.programService.update(id, user,dto, file);
  }


@UseGuards(JwtAuthGuard)
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)


  @Delete(':id')
 remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.programService.remove(id, user);
  }
}
