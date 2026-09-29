import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { CodigoIdentificacaoService } from './codigo-identificacao.service';
import { GerarLoteDto } from './dto/gerar-lote.dto';
import { VincularCodigoDto } from './dto/vincular-codigo.dto';
import { ReemitirCodigoDto } from './dto/reemitir-codigo.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/auth.service';

@Controller('codigo')
export class CodigoIdentificacaoController {
  constructor(private readonly codigoService: CodigoIdentificacaoService) {}

  @Post('lote')
  gerarLote(@CurrentUser() user: JwtPayload, @Body() dto: GerarLoteDto) {
    return this.codigoService.gerarLote(user.fazendaId, dto);
  }

  @Get(':codigo')
  buscarPorCodigo(@CurrentUser() user: JwtPayload, @Param('codigo') codigo: string) {
    return this.codigoService.buscarPorCodigo(user.fazendaId, codigo);
  }

  @Post(':codigo/vincular')
  vincular(
    @CurrentUser() user: JwtPayload,
    @Param('codigo') codigo: string,
    @Body() dto: VincularCodigoDto,
  ) {
    return this.codigoService.vincular(user.fazendaId, codigo, dto);
  }

  @Post('reemitir')
  reemitir(@CurrentUser() user: JwtPayload, @Body() dto: ReemitirCodigoDto) {
    return this.codigoService.reemitir(user.fazendaId, dto);
  }
}