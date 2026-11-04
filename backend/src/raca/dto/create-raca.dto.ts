import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateRacaDto {
  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsInt()
  @Min(200)
  @Max(400)
  gestacaoMediaDias: number;

  // Raça leiteira: o parto da vaca abre lactação no módulo Leite (spec 004, FR-004a)
  @IsOptional()
  @IsBoolean()
  leiteira?: boolean;
}