import { IsNotEmpty, IsString, MinLength } from 'class-validator';

// Troca da própria senha (spec 007, FR-001 e FR-002)
export class TrocarSenhaDto {
  @IsString()
  @IsNotEmpty({ message: 'Informe a senha atual' })
  senhaAtual: string;

  @IsString()
  @MinLength(8, { message: 'A senha nova precisa ter 8 caracteres ou mais' })
  novaSenha: string;
}
