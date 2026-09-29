import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { CodigoIdentificacaoService } from './codigo-identificacao.service';
import { GerarLoteDto } from './dto/gerar-lote.dto';
import { VincularCodigoDto } from './dto/vincular-codigo.dto';
import { ReemitirCodigoDto } from './dto/reemitir-codigo.dto';

@Controller('codigo')
export class CodigoIdentificacaoController {
  constructor(private readonly codigoService: CodigoIdentificacaoService) {}

  @Post('lote')
  gerarLote(@Body() dto: GerarLoteDto) {
    return this.codigoService.gerarLote(dto);
  }

  @Get(':codigo')
  buscarPorCodigo(@Param('codigo') codigo: string) {
    return this.codigoService.buscarPorCodigo(codigo);
  }

  @Post(':codigo/vincular')
  vincular(@Param('codigo') codigo: string, @Body() dto: VincularCodigoDto) {
    return this.codigoService.vincular(codigo, dto);
  }

  @Post('reemitir')
  reemitir(@Body() dto: ReemitirCodigoDto) {
    return this.codigoService.reemitir(dto);
  }
}