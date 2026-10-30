import { Type } from 'class-transformer';
import {
  IsInt,
  IsIn,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

export class PaginationSortDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @IsOptional()
  @IsIn(['id', 'name', 'createdAt', 'updatedAt'])
  sortBy: 'id' | 'name' | 'createdAt' | 'updatedAt' = 'id';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'asc';
}