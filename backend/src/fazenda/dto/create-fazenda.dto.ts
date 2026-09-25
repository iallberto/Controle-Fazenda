import { IsNotEmpty, IsString } from 'class-validator';

export class CreateFazendaDto {
  @IsString()
  @IsNotEmpty()
  nome: string;
}