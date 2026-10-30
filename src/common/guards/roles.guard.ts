import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { UserRole } from '../enums/index.js';
  
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(), // الـ method
      context.getClass(), // الـ controller
    ]);
    if (!roles) return true; 
    const req= context.switchToHttp().getRequest();
    const user=req.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    if(user.role === UserRole.ADMIN){
      return true;
    }
    
    if (!roles.includes(user.role)) {
      throw new ForbiddenException('You do not have permission to access this resource');
    }
    return true;
  }
}
