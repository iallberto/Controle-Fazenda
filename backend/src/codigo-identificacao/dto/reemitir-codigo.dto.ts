import { IsUUID } from 'class-validator';

export class ReemitirCodigoDto {
  @IsUUID()
  animalId: string;

  @IsUUID()
  fazendaId: string;
}