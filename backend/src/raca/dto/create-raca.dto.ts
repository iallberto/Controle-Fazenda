import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export class CreateRacaDto {
  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsInt()
  @Min(200)
  @Max(400)
  gestacaoMediaDias: number;
}