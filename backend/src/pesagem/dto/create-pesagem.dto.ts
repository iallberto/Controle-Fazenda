import { IsDateString, IsNumber, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';

export class CreatePesagemDto {
  @IsUUID()
  animalId: string;

  @IsNumber()
  @IsPositive()
  pesoKg: number;

  @IsDateString()
  data: string;

  @IsOptional()
  @IsUUID()
  pesadoPorId?: string;

  @IsOptional()
  @IsString()
  observacao?: string;
}