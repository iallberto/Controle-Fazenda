import { PartialType } from '@nestjs/mapped-types';
import { CreateRacaDto } from './create-raca.dto';

export class UpdateRacaDto extends PartialType(CreateRacaDto) {}