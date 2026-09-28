import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreatePastoDto {
  @IsUUID()
  fazendaId: string;

  @IsString()
  @IsNotEmpty()
  nome: string;
}