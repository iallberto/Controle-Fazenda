import { PartialType, PickType } from '@nestjs/mapped-types';
import { CreatePartoDto } from './create-parto.dto';

export class UpdatePartoDto extends PartialType(
  PickType(CreatePartoDto, ['data', 'tipo', 'observacoes'] as const),
) {}