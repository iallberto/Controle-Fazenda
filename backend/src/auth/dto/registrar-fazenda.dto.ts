import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegistrarFazendaDto {
  @IsString()
  @IsNotEmpty()
  nomeFazenda: string;

  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  senha: string;
}