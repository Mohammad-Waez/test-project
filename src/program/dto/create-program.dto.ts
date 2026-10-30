import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateProgramDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  teacherId: number;

  @IsOptional()
    @Type(() => Number)
    @IsInt()
capacity: number;



}
