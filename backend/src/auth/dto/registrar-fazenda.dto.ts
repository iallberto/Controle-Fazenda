import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { NormalizarEmail } from '../../common/transformacoes';

export class RegistrarFazendaDto {
  @IsString()
  @IsNotEmpty()
  nomeFazenda: string;

  @IsString()
  @IsNotEmpty()
  nome: string;

  @NormalizarEmail()
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  senha: string;
}