import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { AplicadoPorTipo } from '../../tratamento/entities/tratamento.entity';
import { TipoInseminacao } from '../entities/inseminacao.entity';

// Um botijão raramente passa de algumas centenas de doses por sêmen
const MAX_DOSES = 10000;

const aparar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class SemenDto {
  @Transform(aparar)
  @IsString()
  @IsNotEmpty({ message: 'Informe o nome do touro do sêmen' })
  @MaxLength(100)
  nomeTouro: string;

  @IsOptional()
  @IsUUID()
  racaId?: string;

  @IsOptional()
  @Transform(aparar)
  @IsString()
  @MaxLength(100)
  central?: string;

  @IsInt()
  @Min(0)
  @Max(MAX_DOSES)
  doses: number;
}

// Compra de doses de um sêmen já cadastrado (FR-012)
export class EntradaDosesDto {
  @IsInt()
  @IsPositive({ message: 'A entrada precisa ter ao menos uma dose' })
  @Max(MAX_DOSES)
  doses: number;
}

class AplicadorDto {
  @IsEnum(AplicadoPorTipo)
  aplicadoPorTipo: AplicadoPorTipo;

  @ValidateIf((dto) => dto.aplicadoPorTipo === AplicadoPorTipo.USUARIO)
  @IsUUID()
  aplicadoPorUsuarioId?: string;

  @ValidateIf((dto) => dto.aplicadoPorTipo === AplicadoPorTipo.VETERINARIO)
  @IsUUID()
  aplicadoPorVeterinarioId?: string;
}

export class InseminacaoDto extends AplicadorDto {
  @IsUUID()
  femeaId: string;

  @IsDateString()
  data: string;

  @IsEnum(TipoInseminacao)
  tipo: TipoInseminacao;

  @IsUUID()
  semenId: string;
}

// Só o dono (FR-026). Trocar o aplicador exige mandar o tipo junto.
export class EditarInseminacaoDto {
  @IsOptional()
  @IsDateString()
  data?: string;

  @IsOptional()
  @IsEnum(TipoInseminacao)
  tipo?: TipoInseminacao;

  @IsOptional()
  @IsUUID()
  semenId?: string;

  @IsOptional()
  @IsEnum(AplicadoPorTipo)
  aplicadoPorTipo?: AplicadoPorTipo;

  @ValidateIf((dto) => dto.aplicadoPorTipo === AplicadoPorTipo.USUARIO)
  @IsUUID()
  aplicadoPorUsuarioId?: string;

  @ValidateIf((dto) => dto.aplicadoPorTipo === AplicadoPorTipo.VETERINARIO)
  @IsUUID()
  aplicadoPorVeterinarioId?: string;
}

export class FiltroInseminacoesDto {
  @IsOptional()
  @IsUUID()
  femeaId?: string;
}
