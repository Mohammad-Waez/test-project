
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsEnum,
  IsUrl,
  IsInt,
  Min,
} from 'class-validator';

export enum SessionType {
  IN_PERSON = 'IN_PERSON',
  ONLINE = 'ONLINE',
}

export class CreateProgramSessionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsEnum(SessionType)
  type: SessionType;

  @IsString()
  @IsNotEmpty()
  location: string;

  @IsUrl()
  @IsNotEmpty()
  meetingUrl: string;

  @IsInt()
  @Min(1)
  programId: number;
}
