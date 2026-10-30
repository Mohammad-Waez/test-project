import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ProgramSessionService } from './program-session.service.js';
import { CreateProgramSessionDto } from './dto/create-program-session.dto.js';
import { UpdateProgramSessionDto } from './dto/update-program-session.dto.js';
import { CurrentUser } from '../common/decorators/index.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../common/enums/index.js';

@UseGuards(JwtAuthGuard)
@Controller('program-session')
export class ProgramSessionController {
  constructor(private readonly programSessionService: ProgramSessionService) {}

   @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @Post()
  create(@Body() createProgramSessionDto: CreateProgramSessionDto) {
    return this.programSessionService.create(createProgramSessionDto);
  }

  @Get()
  findAll() {
    return this.programSessionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.programSessionService.findOne(+id);
  }
 @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProgramSessionDto: UpdateProgramSessionDto,@CurrentUser() user:{id:number,role:UserRole}) {
    return this.programSessionService.update(+id, updateProgramSessionDto,user);
  }
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @Delete(':id')
  remove(@Param('id') id: string,@CurrentUser() user:{id:number,role:UserRole}) {
    return this.programSessionService.remove(+id,user);
  }
}
