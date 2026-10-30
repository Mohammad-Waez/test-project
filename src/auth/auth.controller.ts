import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service.js';


import { RegisterDto } from './dto/registerDto.js';
import { LoginDto } from './dto/loginDto.js';
import { CurrentUser } from '../common/decorators/index.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import type{ User } from '../generated/prisma/client.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post ('register')
  async register(@Body() registerDto: RegisterDto) {
    return await this.authService.register(registerDto);
  }
  @Post ('login')
   async login(@Body() loginDto: LoginDto) {
    return await this.authService.login(loginDto);
  }
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  profile(@CurrentUser() user:User) {
    return this.authService.getMyProfile(user);
  }

}