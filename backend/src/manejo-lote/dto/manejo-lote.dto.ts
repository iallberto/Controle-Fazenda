import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { CategoriaAnimal } from '../../animal/entities/animal.entity';
import { AplicadoPorTipo } from '../../tratamento/entities/tratamento.entity';

// Limite por sessão, para uma requisição não travar o banco
const MAX_ANIMAIS = 500;

export class FiltroGrupoDto {
  @IsOptional()
  @IsUUID()
  pastoId?: string;

  @IsOptional()
  @IsEnum(CategoriaAnimal)
  categoria?: CategoriaAnimal;
}

export class ExcecaoDto {
  @IsUUID()
  animalId: string;

  @IsString()
  @IsNotEmpty({ message: 'Informe o motivo de cada animal deixado de fora' })
  @MaxLength(200)
  motivo: string;
}

class SessaoBaseDto extends FiltroGrupoDto {
  // Animais do grupo que recebem a ação (os marcados na tela)
  @IsArray()
  @ArrayMaxSize(MAX_ANIMAIS)
  @IsUUID('all', { each: true })
  animalIds: string[];

  // Animais do grupo desmarcados, cada um com o motivo
  @IsArray()
  @ArrayMaxSize(MAX_ANIMAIS)
  @ValidateNested({ each: true })
  @Type(() => ExcecaoDto)
  excecoes: ExcecaoDto[];
}

export class TratamentoEmLoteDto extends SessaoBaseDto {
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

export class PastoEmLoteDto extends SessaoBaseDto {
  @IsUUID()
  pastoDestinoId: string;

  @IsOptional()
  @IsDateString()
  data?: string;
}
