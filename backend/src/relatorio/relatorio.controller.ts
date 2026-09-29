import { Controller, Get, Query } from '@nestjs/common';
import { RelatorioService } from './relatorio.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/auth.service';


@Controller('relatorio')
export class RelatorioController {
  constructor(private readonly relatorioService: RelatorioService) {}

  @Get('painel-inicial')
  painelInicial(@CurrentUser() user: JwtPayload) {
    return this.relatorioService.painelInicial(user.fazendaId);
  }

    @Get('nascimentos')
  nascimentos(
    @CurrentUser() user: JwtPayload,
    @Query('inicio') inicio: string,
    @Query('fim') fim: string,
  ) {
    return this.relatorioService.nascimentosPorPeriodo(user.fazendaId, inicio, fim);
  }

  @Get('natimortos')
  natimortos(
    @CurrentUser() user: JwtPayload,
    @Query('inicio') inicio: string,
    @Query('fim') fim: string,
  ) {
    return this.relatorioService.natimortos(user.fazendaId, inicio, fim);
  }

  @Get('obitos-por-causa')
  obitosPorCausa(
    @CurrentUser() user: JwtPayload,
    @Query('inicio') inicio: string,
    @Query('fim') fim: string,
  ) {
    return this.relatorioService.obitosPorCausa(user.fazendaId, inicio, fim);
  }

  @Get('tratamentos')
  tratamentos(
    @CurrentUser() user: JwtPayload,
    @Query('inicio') inicio: string,
    @Query('fim') fim: string,
  ) {
    return this.relatorioService.tratamentosPorPeriodo(user.fazendaId, inicio, fim);
  }
}