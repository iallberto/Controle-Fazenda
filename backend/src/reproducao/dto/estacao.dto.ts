import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CategoriaAnimal } from '../../animal/entities/animal.entity';

const MAX_FEMEAS = 500;

export class ExcecaoFemeaDto {
  @IsUUID()
  femeaId: string;

  @IsString()
  @IsNotEmpty({ message: 'Informe o motivo de cada fêmea deixada de fora' })
  @MaxLength(200)
  motivo: string;
}

export class AbrirEstacaoDto {
  @IsUUID()
  touroId: string;

  @IsUUID()
  pastoId: string;

  @IsDateString()
  dataEntrada: string;

  // Fêmeas aptas do pasto que entram na estação (as marcadas na tela)
  @IsArray()
  @ArrayMaxSize(MAX_FEMEAS)
  @IsUUID('all', { each: true })
  femeaIds: string[];

  // Fêmeas aptas deixadas de fora, cada uma com motivo
  @IsArray()
  @ArrayMaxSize(MAX_FEMEAS)
  @ValidateNested({ each: true })
  @Type(() => ExcecaoFemeaDto)
  excecoes: ExcecaoFemeaDto[];
}

export class IncluirFemeasDto {
  @IsArray()
  @ArrayMaxSize(MAX_FEMEAS)
  @IsUUID('all', { each: true })
  femeaIds: string[];

  @IsDateString()
  dataInicio: string;
}

export class EncerrarEstacaoDto {
  @IsDateString()
  dataSaida: string;
}

export class EditarEstacaoDto {
  @IsOptional()
  @IsDateString()
  dataEntrada?: string;

  @IsOptional()
  @IsDateString()
  dataSaida?: string;
}

export class CancelarDto {
  @IsString()
  @IsNotEmpty({ message: 'Informe o motivo do cancelamento' })
  @MaxLength(200)
  motivo: string;
}

export class FiltroAptasDto {
  @IsOptional()
  @IsUUID()
  pastoId?: string;

  @IsOptional()
  @IsEnum(CategoriaAnimal)
  categoria?: CategoriaAnimal;

  @IsOptional()
  @IsDateString()
  data?: string;
}

export class FiltroEstacoesDto {
  @IsOptional()
  @IsEnum(['ABERTA', 'ENCERRADA'])
  situacao?: 'ABERTA' | 'ENCERRADA';
}
