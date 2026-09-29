import { IsBoolean, IsOptional } from 'class-validator';

export class AtualizarPreferenciasDto {
  @IsOptional()
  @IsBoolean()
  notificacoesAtivas?: boolean;

  @IsOptional()
  @IsBoolean()
  somAtivo?: boolean;
}