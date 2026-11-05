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
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateAnimalDto } from '../../../animal/dto/create-animal.dto';
import { TipoLancamento } from '../entities/categoria-financeira.entity';
import { FormaPrecoVenda } from '../entities/venda-animais.entity';
import { OrigemLancamento } from '../entities/lancamento.entity';

// Teto por lançamento: R$ 20 milhões, em centavos (research R1)
const MAX_CENTAVOS = 2_000_000_000;

const aparar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// --- Categorias ---------------------------------------------------------------

export class CriarCategoriaDto {
  @IsEnum(TipoLancamento)
  tipo: TipoLancamento;

  @Transform(aparar)
  @IsString()
  @IsNotEmpty({ message: 'Informe o nome da categoria' })
  @MaxLength(60)
  nome: string;
}

export class EditarCategoriaDto {
  @IsOptional()
  @Transform(aparar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  nome?: string;

  @IsOptional()
  @IsBoolean()
  ativa?: boolean;
}

export class FiltroCategoriasDto {
  @IsOptional()
  @IsEnum(TipoLancamento)
  tipo?: TipoLancamento;

  @IsOptional()
  @IsIn(['true', 'false'])
  incluirInativas?: 'true' | 'false';
}

// --- Lançamentos ---------------------------------------------------------------

export class CriarLancamentoDto {
  @IsEnum(TipoLancamento)
  tipo: TipoLancamento;

  @IsDateString()
  data: string;

  @IsInt()
  @Min(1, { message: 'O valor precisa ser maior que zero' })
  @Max(MAX_CENTAVOS)
  valorCentavos: number;

  @IsUUID()
  categoriaId: string;

  @Transform(aparar)
  @IsString()
  @IsNotEmpty({ message: 'Informe uma descrição' })
  @MaxLength(200)
  descricao: string;

  @IsOptional()
  @IsUUID()
  animalId?: string;

  @IsOptional()
  @IsUUID()
  pastoId?: string;
}

export class EditarLancamentoDto {
  @IsOptional()
  @IsDateString()
  data?: string;

  @IsOptional()
  @IsInt()
  @Min(1, { message: 'O valor precisa ser maior que zero' })
  @Max(MAX_CENTAVOS)
  valorCentavos?: number;

  @IsOptional()
  @IsUUID()
  categoriaId?: string;

  @IsOptional()
  @Transform(aparar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  descricao?: string;
}

export class FiltroLancamentosDto {
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'Mês no formato AAAA-MM' })
  mes: string;

  @IsOptional()
  @IsEnum(TipoLancamento)
  tipo?: TipoLancamento;

  @IsOptional()
  @IsUUID()
  categoriaId?: string;

  // Filtro por origem (spec 006, FR-011)
  @IsOptional()
  @IsEnum(OrigemLancamento)
  origem?: OrigemLancamento;
}

export class MotivoDto {
  @Transform(aparar)
  @IsString()
  @IsNotEmpty({ message: 'Informe o motivo' })
  @MaxLength(200)
  motivo: string;
}

// --- Vendas ----------------------------------------------------------------------

export class ItemVendaDto {
  @IsUUID()
  animalId: string;

  @IsOptional()
  @Type(() => Number)
  @IsPositive({ message: 'O peso precisa ser maior que zero' })
  @Max(3000)
  pesoKg?: number;
}

export class VendaDto {
  @IsDateString()
  data: string;

  @Transform(aparar)
  @IsString()
  @IsNotEmpty({ message: 'Informe o comprador' })
  @MaxLength(120)
  comprador: string;

  @IsEnum(FormaPrecoVenda)
  forma: FormaPrecoVenda;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_CENTAVOS)
  precoArrobaCentavos?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_CENTAVOS)
  valorTotalCentavos?: number;

  @IsOptional()
  @Transform(aparar)
  @IsString()
  @MaxLength(200)
  observacao?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Escolha ao menos um animal' })
  @ArrayMaxSize(300)
  @ValidateNested({ each: true })
  @Type(() => ItemVendaDto)
  itens: ItemVendaDto[];
}

export class FiltroAnimaisVendaDto {
  @IsOptional()
  @IsUUID()
  pastoId?: string;

  @IsOptional()
  @IsString()
  categoria?: string;
}

export class FiltroPeriodoDto {
  @IsOptional()
  @IsDateString()
  de?: string;

  @IsOptional()
  @IsDateString()
  ate?: string;
}

// --- Registros de uso (sem valores) --------------------------------------------

export class RegistrarUsoDto {
  @IsDateString()
  data: string;

  @Transform(aparar)
  @IsString()
  @IsNotEmpty({ message: 'Informe o item' })
  @MaxLength(120)
  item: string;

  @Type(() => Number)
  @IsPositive({ message: 'A quantidade precisa ser maior que zero' })
  @Max(99999999)
  quantidade: number;

  @Transform(aparar)
  @IsString()
  @IsNotEmpty({ message: 'Informe a unidade (sacos, litros, kg...)' })
  @MaxLength(20)
  unidade: string;

  @IsUUID()
  categoriaId: string;

  @IsOptional()
  @IsUUID()
  animalId?: string;

  @IsOptional()
  @IsUUID()
  pastoId?: string;
}

export class FiltroUsosDto {
  @IsOptional()
  @IsIn(['AGUARDANDO', 'LANCADO', 'DESCARTADO'])
  situacao?: 'AGUARDANDO' | 'LANCADO' | 'DESCARTADO';
}

export class ValorarDto {
  @IsInt()
  @Min(1, { message: 'O valor precisa ser maior que zero' })
  @Max(MAX_CENTAVOS)
  valorCentavos: number;
}

// --- Compras de animais ---------------------------------------------------------

// 0 = o dono não quis lançar (spec 003, FR-016b)
export class ValorCompraDto {
  @IsInt()
  @Min(0)
  @Max(MAX_CENTAVOS)
  valorCentavos: number;

  @IsOptional()
  @Transform(aparar)
  @IsString()
  @MaxLength(120)
  vendedor?: string;
}

// Cadastro do animal comprado + valor da compra, numa rota só (FR-016b)
export class CompraComAnimalDto extends CreateAnimalDto {
  @IsInt()
  @Min(0)
  @Max(MAX_CENTAVOS)
  valorCentavos: number;

  @IsOptional()
  @Transform(aparar)
  @IsString()
  @MaxLength(120)
  vendedor?: string;
}

// Período do resultado em meses AAAA-MM (padrão: 12 meses até o atual)
export class FiltroResultadoDto {
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'Mês no formato AAAA-MM' })
  de?: string;

  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'Mês no formato AAAA-MM' })
  ate?: string;
}
