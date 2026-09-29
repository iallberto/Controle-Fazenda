import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ResultadoParto, TipoParto } from '../entities/parto.entity';
import { Sexo } from '../../animal/entities/animal.entity';

export class CreateCriaDto {
  @IsString()
  brinco: string;

  @IsEnum(Sexo)
  sexo: Sexo;

  @IsOptional()
  @IsUUID()
  racaId?: string;
}

export class CreatePartoDto {
  @IsUUID()
  maeId: string;

  @IsDateString()
  data: string;

  @IsEnum(TipoParto)
  tipo: TipoParto;

  @IsEnum(ResultadoParto)
  resultado: ResultadoParto;

  @IsOptional()
  @IsString()
  observacoes?: string;

  @ValidateIf((dto) => dto.resultado === ResultadoParto.VIVO)
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateCriaDto)
  crias?: CreateCriaDto[];
}