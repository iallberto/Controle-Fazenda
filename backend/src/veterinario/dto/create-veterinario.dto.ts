import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateVeterinarioDto {
  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsOptional()
  @IsString()
  crmv?: string;
}