import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ModuloPago } from '../../acesso/modulo-pago';

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
