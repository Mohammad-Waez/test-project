import { PartialType } from '@nestjs/mapped-types';
import { CreateEnrolllmentDto } from './create-enrolllment.dto.js';

export class UpdateEnrolllmentDto extends PartialType(CreateEnrolllmentDto) {}
