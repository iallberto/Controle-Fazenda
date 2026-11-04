import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { CategoriaAnimal } from '../../animal/entities/animal.entity';
import { AplicadoPorTipo } from '../../tratamento/entities/tratamento.entity';
import {
  MetodoDiagnostico,
  ResultadoDiagnostico,
} from '../entities/diagnostico-gestacao.entity';

// Gestação bovina passa pouco de 300 dias; acima disso é erro de digitação
const MAX_IDADE_GESTACIONAL = 320;

class QuemFezDto {
  @IsEnum(AplicadoPorTipo)
  feitoPorTipo: AplicadoPorTipo;

  @ValidateIf((dto) => dto.feitoPorTipo === AplicadoPorTipo.USUARIO)
  @IsUUID()
  feitoPorUsuarioId?: string;

  @ValidateIf((dto) => dto.feitoPorTipo === AplicadoPorTipo.VETERINARIO)
  @IsUUID()
  feitoPorVeterinarioId?: string;
}

export class DiagnosticoDto extends QuemFezDto {
  @IsUUID()
  femeaId: string;

  @IsDateString()
  data: string;

  @IsIn([ResultadoDiagnostico.PRENHE, ResultadoDiagnostico.VAZIA])
  resultado: ResultadoDiagnostico.PRENHE | ResultadoDiagnostico.VAZIA;

  @IsEnum(MetodoDiagnostico)
  metodo: MetodoDiagnostico;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @Max(MAX_IDADE_GESTACIONAL)
  idadeGestacionalDias?: number;
}

export class ResultadoLoteDto {
  @IsUUID()
  femeaId: string;

  @IsIn([ResultadoDiagnostico.PRENHE, ResultadoDiagnostico.VAZIA])
  resultado: ResultadoDiagnostico.PRENHE | ResultadoDiagnostico.VAZIA;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @Max(MAX_IDADE_GESTACIONAL)
  idadeGestacionalDias?: number;
}

export class DiagnosticoLoteDto extends QuemFezDto {
  @IsOptional()
  @IsUUID()
  pastoId?: string;

  @IsOptional()
  @IsEnum(CategoriaAnimal)
  categoria?: CategoriaAnimal;

  @IsDateString()
  data: string;

  @IsEnum(MetodoDiagnostico)
  metodo: MetodoDiagnostico;

  @IsArray()
  @ArrayMinSize(1, { message: 'Marque o resultado de ao menos uma fêmea' })
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ResultadoLoteDto)
  resultados: ResultadoLoteDto[];
}

export class PerdaDto {
  @IsUUID()
  femeaId: string;

  @IsDateString()
  data: string;

  @IsString()
  @IsNotEmpty({ message: 'Informe o motivo da perda de gestação' })
  @MaxLength(200)
  motivo: string;
}

export class EditarDiagnosticoDto {
  @IsOptional()
  @IsDateString()
  data?: string;

  @IsOptional()
  @IsIn([ResultadoDiagnostico.PRENHE, ResultadoDiagnostico.VAZIA])
  resultado?: ResultadoDiagnostico.PRENHE | ResultadoDiagnostico.VAZIA;

  @IsOptional()
  @IsEnum(MetodoDiagnostico)
  metodo?: MetodoDiagnostico;

  // null limpa a idade informada
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Max(MAX_IDADE_GESTACIONAL)
  idadeGestacionalDias?: number | null;
}

export class FiltroGrupoDiagnosticoDto {
  @IsOptional()
  @IsUUID()
  pastoId?: string;

  @IsOptional()
  @IsEnum(CategoriaAnimal)
  categoria?: CategoriaAnimal;
}
