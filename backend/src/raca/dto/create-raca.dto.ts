import { IsInt, IsNotEmpty, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateRacaDto {
  @IsUUID()
  fazendaId: string;

  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsInt()
  @Min(200)
  @Max(400)
  gestacaoMediaDias: number;
}