import { IsEmail, IsEnum, IsNotEmpty, IsString, IsUUID, MinLength } from 'class-validator';
import { PapelUsuario } from '../entities/usuario.entity';

export class CreateUsuarioDto {
  @IsUUID()
  fazendaId: string;

  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  senha: string;

  @IsEnum(PapelUsuario)
  papel: PapelUsuario;
}