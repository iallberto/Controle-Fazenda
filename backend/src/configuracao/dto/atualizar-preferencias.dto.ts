import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { SomNotificacao } from '../entities/configuracao-fazenda.entity';

export class AtualizarPreferenciasDto {
  @IsOptional()
  @IsBoolean()
  notificacoesAtivas?: boolean;

  @IsOptional()
  @IsBoolean()
  somAtivo?: boolean;

  @IsOptional()
  @IsEnum(SomNotificacao)
  som?: SomNotificacao;
}