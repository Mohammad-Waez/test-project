import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from "class-validator";

import { UserRole } from "../../generated/prisma/enums.js";

export class CreateUserDto {


  @IsNotEmpty()
  @IsString()
  userName: string;

  @IsNotEmpty()
  @IsString()
  @IsEmail()
  email: string;


  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @IsNotEmpty()
  @IsString()
  firstName: string;

  @IsNotEmpty()
  @IsString()
  lastName: string;

@IsEnum(UserRole)
role:UserRole


}
