import {
  ArrayUnique,
  IsArray,
  IsInt,
  Min,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ModuloPago } from '../../acesso/modulo-pago';
import { NormalizarEmail } from '../../../common/transformacoes';

export class AdminLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  senha: string;
}

export class FiltroFazendasDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  busca?: string;
}

export class LiberarModuloDto {
  @IsEnum(ModuloPago)
  modulo: ModuloPago;

  @IsDateString()
  dataInicio: string;

  // Só para contrato com prazo (D9)
  @IsOptional()
  @IsDateString()
  dataTermino?: string;
}

export class SuspenderFazendaDto {
  @IsString()
  @IsNotEmpty({ message: 'Informe o motivo da suspensão' })
  @MaxLength(200)
  motivo: string;
}

// Troca da senha do administrador (spec 007); a regra de 12 caracteres é
// conferida no serviço, com a mesma mensagem do comando criar-admin
export class AdminTrocarSenhaDto {
  @IsString()
  @IsNotEmpty({ message: 'Informe a senha atual' })
  senhaAtual: string;

  @IsString()
  @IsNotEmpty({ message: 'Informe a senha nova' })
  novaSenha: string;
}

// Fazenda nova criada pelo administrador (spec 007, FR-023)
export class CriarFazendaDto {
  @IsString()
  @IsNotEmpty({ message: 'Informe o nome da fazenda' })
  @MaxLength(150)
  nomeFazenda: string;

  @IsString()
  @IsNotEmpty({ message: 'Informe o nome do dono' })
  @MaxLength(150)
  nomeDono: string;

  @NormalizarEmail()
  @IsEmail({}, { message: 'E-mail do dono inválido' })
  emailDono: string;
}

// Teste de 30 dias com os módulos escolhidos (spec 008, FR-010)
export class LiberarTesteDto {
  @IsArray()
  @ArrayUnique()
  @IsEnum(ModuloPago, { each: true })
  modulos: ModuloPago[];
}

// Pagamento por Pix confirmado no painel; sem valor, usa o preço do plano (FR-012)
export class ConfirmarPagamentoDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  valorCentavos?: number;
}

export class EstenderPrazoDto {
  @IsDateString()
  acessoAte: string;
}

export class AlterarFazendaDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefoneContato?: string | null;
}

// Preços do plano em centavos (R5)
export class PrecosPlanoDto {
  @IsOptional() @IsInt() @Min(0) PACOTE_INICIAL?: number;
  @IsOptional() @IsInt() @Min(0) LEITE?: number;
  @IsOptional() @IsInt() @Min(0) FINANCEIRO?: number;
  @IsOptional() @IsInt() @Min(0) NUTRICAO?: number;
}
