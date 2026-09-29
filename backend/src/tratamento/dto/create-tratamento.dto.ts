import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';

export class CreateTratamentoDto {
  @IsUUID()
  animalId: string;

  @IsString()
  @IsNotEmpty()
  produto: string;

  @IsDateString()
  data: string;

  @IsString()
  @IsNotEmpty()
  responsavel: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  recorrenciaDias?: number;
}
