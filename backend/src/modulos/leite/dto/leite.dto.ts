import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { VacaDeLeite } from '../../../animal/entities/animal.entity';
import { ModoOrdenha } from '../entities/configuracao-leite.entity';

const aparar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// --- Configuração (FR-009, FR-019; R8) ---------------------------------------

export class EditarConfiguracaoLeiteDto {
  @IsOptional()
  @IsEnum(ModoOrdenha)
  modo?: ModoOrdenha;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  ordenhasPorDia?: number;

  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(90)
  prazoSecagemDias?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  janelaSecarDias?: number;
}

// --- Vacas e lactação (FR-004 a FR-008) --------------------------------------

export class FiltroVacasDto {
  @IsOptional()
  @IsIn(['EM_LACTACAO', 'SECA', 'TODAS'])
  situacao?: 'EM_LACTACAO' | 'SECA' | 'TODAS';
}

export class VacaDeLeiteDto {
  @IsEnum(VacaDeLeite)
  vacaDeLeite: VacaDeLeite;
}

export class IniciarLactacaoDto {
  @IsUUID()
  animalId: string;

  @IsDateString({ strict: true })
  inicio: string;

  @IsOptional()
  @IsUUID()
  partoId?: string;
}

// --- Ordenha (FR-009 a FR-014; R5) -------------------------------------------

export class TurnoDto {
  @IsOptional()
  @IsDateString({ strict: true })
  data?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3)
  turno?: number;
}

export class DiaDto {
  @IsOptional()
  @IsDateString({ strict: true })
  data?: string;
}

export class OrdenhaVacaDto {
  @IsDateString({ strict: true })
  data: string;

  @IsInt()
  @Min(1)
  @Max(3)
  turno: number;

  @IsUUID()
  animalId: string;

  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  litros: number;

  @IsOptional()
  @IsBoolean()
  confirmarAcima?: boolean;
}

export class OrdenhaTanqueDto {
  @IsDateString({ strict: true })
  data: string;

  @IsInt()
  @Min(1)
  @Max(3)
  turno: number;

  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(100000)
  litros: number;
}

// --- Produtos (FR-015) -------------------------------------------------------

export class CriarProdutoDto {
  @Transform(aparar)
  @IsString()
  @IsNotEmpty({ message: 'Informe o nome do produto' })
  @MaxLength(80)
  nome: string;

  @IsInt()
  @Min(0)
  @Max(120)
  carenciaLeiteDias: number;
}

export class EditarProdutoDto {
  @IsOptional()
  @Transform(aparar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  nome?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  carenciaLeiteDias?: number;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

export class FiltroProdutosDto {
  @IsOptional()
  @IsIn(['true', 'false'])
  incluirInativos?: string;
}

// --- Secagem (FR-019 a FR-021) -----------------------------------------------

export class FiltroASecarDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(120)
  dias?: number;
}

export class RegistrarSecagemDto {
  @IsUUID()
  animalId: string;

  @IsDateString({ strict: true })
  data: string;

  @IsOptional()
  @Transform(aparar)
  @IsString()
  @MaxLength(200)
  observacao?: string;
}

export class MotivoLeiteDto {
  @Transform(aparar)
  @IsString()
  @IsNotEmpty({ message: 'Informe o motivo' })
  @MaxLength(200)
  motivo: string;
}

// --- Entregas e análises (FR-022 a FR-025) -----------------------------------

const MAX_PRECO_LITRO_CENTAVOS = 100_00;

export class FiltroMesDto {
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'Mês no formato AAAA-MM' })
  mes?: string;
}

export class FiltroAnalisesDto {
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  de?: string;

  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  ate?: string;
}

export class CriarEntregaDto {
  @IsDateString({ strict: true })
  data: string;

  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0.1)
  @Max(1_000_000)
  litros: number;

  @IsOptional()
  @Transform(aparar)
  @IsString()
  @MaxLength(200)
  observacao?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_PRECO_LITRO_CENTAVOS)
  precoLitroCentavos?: number;
}

export class EditarEntregaDto {
  @IsOptional()
  @IsDateString({ strict: true })
  data?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0.1)
  @Max(1_000_000)
  litros?: number;

  @IsOptional()
  @Transform(aparar)
  @IsString()
  @MaxLength(200)
  observacao?: string;
}

export class PrecoEntregaDto {
  @IsInt()
  @Min(1)
  @Max(MAX_PRECO_LITRO_CENTAVOS)
  precoLitroCentavos: number;
}

export class PrecoDoMesDto extends PrecoEntregaDto {
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'Mês no formato AAAA-MM' })
  mes: string;
}

export class CriarAnaliseDto {
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'Mês no formato AAAA-MM' })
  mes: string;

  @IsOptional()
  @IsUUID()
  entregaId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000)
  ccsMil?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000)
  cbtMil?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(20)
  gordura?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(20)
  proteina?: number;
}
