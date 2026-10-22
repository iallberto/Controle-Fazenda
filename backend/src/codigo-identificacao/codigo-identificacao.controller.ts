import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CodigoIdentificacaoService } from './codigo-identificacao.service';
import { GerarLoteDto } from './dto/gerar-lote.dto';
import { VincularCodigoDto } from './dto/vincular-codigo.dto';
import { ReemitirCodigoDto } from './dto/reemitir-codigo.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/auth.service';

@ApiTags('codigo')
@ApiBearerAuth()
@Controller('codigo')
export class CodigoIdentificacaoController {
  constructor(private readonly codigoService: CodigoIdentificacaoService) {}

  @Get('disponiveis')
  listarDisponiveis(@CurrentUser() user: JwtPayload) {
    return this.codigoService.listarDisponiveis(user.fazendaId);
  }

  @Post('lote')
  gerarLote(@CurrentUser() user: JwtPayload, @Body() dto: GerarLoteDto) {
    return this.codigoService.gerarLote(user.fazendaId, user.sub, dto);
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
    return this.codigoService.reemitir(user.fazendaId, user.sub, dto);
  }
}