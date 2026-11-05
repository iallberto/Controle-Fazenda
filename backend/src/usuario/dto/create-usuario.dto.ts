import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { NormalizarEmail } from '../../common/transformacoes';
import { PapelUsuario } from '../entities/usuario.entity';

export class CreateUsuarioDto {

  @IsString()
  @IsNotEmpty()
  nome: string;

  @NormalizarEmail()
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: 'A senha precisa ter 8 caracteres ou mais' })
  senha: string;

  @IsEnum(PapelUsuario)
  papel: PapelUsuario;
}