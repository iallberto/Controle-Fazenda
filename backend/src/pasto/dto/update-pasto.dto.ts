import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreatePastoDto } from './create-pasto.dto';

export class UpdatePastoDto extends PartialType(
  OmitType(CreatePastoDto, ['fazendaId'] as const),
) {}