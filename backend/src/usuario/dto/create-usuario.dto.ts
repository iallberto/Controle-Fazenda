import { IsEmail, IsEnum, IsNotEmpty, IsString, IsUUID, MinLength } from 'class-validator';
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
  @MinLength(6)
  senha: string;

  @IsEnum(PapelUsuario)
  papel: PapelUsuario;
}