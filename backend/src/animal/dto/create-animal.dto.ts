import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import {
  CategoriaAnimal,
  OrigemAnimal,
  Sexo,
  StatusReprodutivo,
} from '../entities/animal.entity';

export class CreateAnimalDto {

  @IsString()
  @IsNotEmpty()
  brinco: string;

  @IsEnum(Sexo)
  sexo: Sexo;

  @IsEnum(CategoriaAnimal)
  categoria: CategoriaAnimal;

  @IsOptional()
  @IsEnum(StatusReprodutivo)
  statusReprodutivo?: StatusReprodutivo;

  @IsEnum(OrigemAnimal)
  origem: OrigemAnimal;

  @IsDateString()
  dataNascimento: string;

  @IsOptional()
  @IsUUID()
  racaId?: string;

  @ValidateIf((dto) => dto.origem === OrigemAnimal.NASCIDO_FAZENDA)
  @IsUUID()
  maeId?: string;

  @IsOptional()
  @IsUUID()
  paiId?: string;

  @IsOptional()
  @IsUUID()
  pastoAtualId?: string;

  @IsOptional()
  @IsString()
  caracteristicasVisuais?: string;

  @ValidateIf((dto) => dto.origem === OrigemAnimal.COMPRADO)
  @IsDateString()
  dataCompra?: string;

  @IsOptional()
  @IsString()
  procedencia?: string;
}