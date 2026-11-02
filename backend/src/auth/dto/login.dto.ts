import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { NormalizarEmail } from '../../common/transformacoes';

export class LoginDto {
  @NormalizarEmail()
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  senha: string;
}