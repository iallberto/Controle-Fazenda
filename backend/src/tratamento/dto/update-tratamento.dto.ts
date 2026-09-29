import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateTratamentoDto } from './create-tratamento.dto';

export class UpdateTratamentoDto extends PartialType(
  OmitType(CreateTratamentoDto, ['animalId'] as const),
) {}