import { IsNotEmpty, IsString } from 'class-validator';

export class CreatePastoDto {
  @IsString()
  @IsNotEmpty()
  nome: string;
}