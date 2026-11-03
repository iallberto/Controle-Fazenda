import { Controller, DefaultValuePipe, Get, ParseIntPipe, Query } from '@nestjs/common';
import { RelatorioService } from './relatorio.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/auth.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';


@ApiTags('relatorio')
@ApiBearerAuth()
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

  @Get('proximos-tratamentos')
  proximosTratamentos(
    @CurrentUser() user: JwtPayload,
    @Query('dias', new DefaultValuePipe(30), ParseIntPipe) dias: number,
  ) {
    // Janela de 0 a 365 dias à frente; os atrasados aparecem sempre
    const janela = Math.min(Math.max(dias, 0), 365);
    return this.relatorioService.proximosTratamentos(user.fazendaId, janela);
  }

  @Get('por-raca')
  porRaca(@CurrentUser() user: JwtPayload) {
    return this.relatorioService.porRaca(user.fazendaId);
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