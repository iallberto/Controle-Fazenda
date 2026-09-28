import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateAnimalDto } from './create-animal.dto';

export class UpdateAnimalDto extends PartialType(
  OmitType(CreateAnimalDto, ['fazendaId', 'origem'] as const),
) {}