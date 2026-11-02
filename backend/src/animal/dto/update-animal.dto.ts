import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateAnimalDto } from './create-animal.dto';

export class UpdateAnimalDto extends PartialType(
  // O pasto atual só muda por POST /movimentacao-pasto, para manter o histórico
  OmitType(CreateAnimalDto, ['origem', 'codigoId', 'pastoAtualId'] as const),
) {}