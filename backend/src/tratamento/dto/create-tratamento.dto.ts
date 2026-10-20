import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { AplicadoPorTipo } from '../entities/tratamento.entity';

export class CreateTratamentoDto {
  @IsUUID()
  animalId: string;

  @IsString()
  @IsNotEmpty()
  produto: string;

  @IsDateString()
  data: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  recorrenciaDias?: number;

  @IsEnum(AplicadoPorTipo)
  aplicadoPorTipo: AplicadoPorTipo;

  @ValidateIf((dto) => dto.aplicadoPorTipo === AplicadoPorTipo.USUARIO)
  @IsUUID()
  aplicadoPorUsuarioId?: string;

  @ValidateIf((dto) => dto.aplicadoPorTipo === AplicadoPorTipo.VETERINARIO)
  @IsUUID()
  aplicadoPorVeterinarioId?: string;
}