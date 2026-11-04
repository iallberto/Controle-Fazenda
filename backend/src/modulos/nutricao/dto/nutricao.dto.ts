import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
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
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { TipoInsumo, UnidadeBase } from '../entities/insumo.entity';
import { MotivoMovimento } from '../entities/movimento-insumo.entity';
import { TipoSilo } from '../entities/silo.entity';

const aparar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const MAX_CENTAVOS = 2_000_000_000;

// --- Insumos (FR-004 a FR-004b) ----------------------------------------------

export class CriarInsumoDto {
  @Transform(aparar)
  @IsString()
  @IsNotEmpty({ message: 'Informe o nome do insumo' })
  @MaxLength(80)
  nome: string;

  @IsEnum(TipoInsumo)
  tipo: TipoInsumo;

  @IsEnum(UnidadeBase)
  unidadeBase: UnidadeBase;

  // Estoque mínimo na unidade base
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  estoqueMinimo?: number;
}

export class EditarInsumoDto {
  @IsOptional()
  @Transform(aparar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  nome?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  estoqueMinimo?: number | null;

  @IsOptional()
  @IsUUID()
  unidadeCompraId?: string | null;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

export class CriarUnidadeDto {
  @Transform(aparar)
  @IsString()
  @IsNotEmpty({ message: 'Informe o nome da unidade' })
  @MaxLength(30)
  nome: string;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  @Max(100_000)
  fator: number;
}

export class EditarUnidadeDto {
  @IsBoolean()
  ativa: boolean;
}

export class FiltroInativosDto {
  @IsOptional()
  @IsIn(['true', 'false'])
  incluirInativos?: string;
}

export class FiltroPeriodoDto {
  @IsOptional()
  @IsDateString({ strict: true })
  de?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  ate?: string;

  @IsOptional()
  @IsUUID()
  loteId?: string;
}

// --- Entradas e baixas (FR-005 a FR-008) -------------------------------------

class MovimentoBaseDto {
  @IsUUID()
  insumoId: string;

  @IsDateString({ strict: true })
  data: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(10_000_000)
  quantidade: number;

  @IsUUID()
  unidadeId: string;

  @IsOptional()
  @Transform(aparar)
  @IsString()
  @MaxLength(200)
  observacao?: string;
}

export class EntradaDto extends MovimentoBaseDto {
  @IsIn([MotivoMovimento.COMPRA, MotivoMovimento.PRODUCAO])
  motivo: MotivoMovimento.COMPRA | MotivoMovimento.PRODUCAO;

  @IsOptional()
  @Transform(aparar)
  @IsString()
  @MaxLength(120)
  fornecedor?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_CENTAVOS)
  valorCentavos?: number;
}

export class BaixaDto extends MovimentoBaseDto {
  @IsIn([MotivoMovimento.PERDA, MotivoMovimento.ESTRAGO, MotivoMovimento.DOACAO, MotivoMovimento.OUTRO])
  motivo: MotivoMovimento.PERDA | MotivoMovimento.ESTRAGO | MotivoMovimento.DOACAO | MotivoMovimento.OUTRO;
}

export class MotivoNutricaoDto {
  @Transform(aparar)
  @IsString()
  @IsNotEmpty({ message: 'Informe o motivo' })
  @MaxLength(200)
  motivo: string;
}

export class PrecoEntradaDto {
  @IsInt()
  @Min(1)
  @Max(MAX_CENTAVOS)
  valorCentavos: number;
}

// --- Dietas e lotes (FR-010 a FR-010b) ---------------------------------------

export class ItemDietaDto {
  @IsUUID()
  insumoId: string;

  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @Max(100_000)
  quantidadePorAnimal: number;

  @IsUUID()
  unidadeId: string;
}

export class DietaDto {
  @Transform(aparar)
  @IsString()
  @IsNotEmpty({ message: 'Informe o nome da dieta' })
  @MaxLength(80)
  nome: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'A dieta precisa de pelo menos um insumo' })
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => ItemDietaDto)
  itens: ItemDietaDto[];
}

export class AtivaDto {
  @IsBoolean()
  ativa: boolean;
}

export class CriarLoteDto {
  @Transform(aparar)
  @IsString()
  @IsNotEmpty({ message: 'Informe o nome do lote' })
  @MaxLength(60)
  nome: string;

  @IsOptional()
  @IsUUID()
  dietaId?: string;
}

export class EditarLoteDto {
  @IsOptional()
  @Transform(aparar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  nome?: string;

  @IsOptional()
  @IsUUID()
  dietaId?: string | null;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

export class AnimaisDoLoteDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Escolha pelo menos um animal' })
  @ArrayMaxSize(2000)
  @IsUUID('all', { each: true })
  animalIds: string[];

  @IsOptional()
  @IsDateString({ strict: true })
  data?: string;
}

export class FiltroDataDto {
  @IsOptional()
  @IsDateString({ strict: true })
  data?: string;
}

// --- Fornecimento (FR-011 a FR-015) ------------------------------------------

export class FiltroSugestaoDto {
  @IsUUID()
  loteId: string;

  @IsOptional()
  @IsDateString({ strict: true })
  data?: string;
}

export class ItemFornecimentoDto {
  @IsUUID()
  insumoId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(10_000_000)
  quantidade: number;

  @IsUUID()
  unidadeId: string;

  @IsOptional()
  @IsUUID()
  siloId?: string;
}

export class FornecimentoDto {
  @IsUUID()
  loteId: string;

  @IsDateString({ strict: true })
  data: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Informe pelo menos um insumo' })
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => ItemFornecimentoDto)
  itens: ItemFornecimentoDto[];

  @IsOptional()
  @IsBoolean()
  confirmarNegativo?: boolean;
}

// --- Silos (FR-016 a FR-019) -------------------------------------------------

export class CriarSiloDto {
  @Transform(aparar)
  @IsString()
  @IsNotEmpty({ message: 'Informe o nome do silo' })
  @MaxLength(60)
  nome: string;

  @IsEnum(TipoSilo)
  tipo: TipoSilo;

  @IsUUID()
  insumoId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100_000)
  toneladasEnsiladas: number;

  @IsDateString({ strict: true })
  fechamento: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_CENTAVOS)
  custoEnsilagemCentavos?: number;
}

export class EditarSiloDto {
  @IsOptional()
  @Transform(aparar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  nome?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100_000)
  toneladasEnsiladas?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_CENTAVOS)
  custoEnsilagemCentavos?: number | null;
}

export class DataObrigatoriaDto {
  @IsDateString({ strict: true })
  data: string;
}
