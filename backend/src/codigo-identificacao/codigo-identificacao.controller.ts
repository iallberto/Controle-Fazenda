import { Controller, Get, Post, Body, Param, ParseUUIDPipe, Query, StreamableFile, HttpCode, HttpStatus } from '@nestjs/common';
import { EtiquetasService } from './etiquetas.service';
import { EtiquetasQueryDto } from './dto/etiquetas-query.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { PapelUsuario } from '../usuario/entities/usuario.entity';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CodigoIdentificacaoService } from './codigo-identificacao.service';
import { GerarLoteDto } from './dto/gerar-lote.dto';
import { VincularCodigoDto } from './dto/vincular-codigo.dto';
import { ReemitirCodigoDto } from './dto/reemitir-codigo.dto';
import { ListarCodigosQueryDto } from './dto/listar-codigos-query.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/auth.service';

@ApiTags('codigo')
@ApiBearerAuth()
@Controller('codigo')
export class CodigoIdentificacaoController {
  constructor(
    private readonly codigoService: CodigoIdentificacaoService,
    private readonly etiquetasService: EtiquetasService,
  ) {}

  // PDF das etiquetas com QR para a gráfica (spec 008, US2). Antes de ':codigo'.
  @Roles(PapelUsuario.DONO)
  @Post('etiquetas')
  @HttpCode(HttpStatus.OK)
  async etiquetas(@CurrentUser() user: JwtPayload, @Body() filtro: EtiquetasQueryDto) {
    const { arquivo } = await this.etiquetasService.gerarPdf(user.fazendaId, filtro);
    return new StreamableFile(arquivo, {
      type: 'application/pdf',
      disposition: 'attachment; filename="etiquetas.pdf"',
    });
  }

  @Get()
  listar(@CurrentUser() user: JwtPayload, @Query() filtro: ListarCodigosQueryDto) {
    return this.codigoService.listar(user.fazendaId, filtro);
  }

  @Get('disponiveis')
  listarDisponiveis(@CurrentUser() user: JwtPayload) {
    return this.codigoService.listarDisponiveis(user.fazendaId);
  }

  @Get('numero/:numero')
  buscarPorNumero(@CurrentUser() user: JwtPayload, @Param('numero') numero: string) {
    return this.codigoService.buscarPorNumero(user.fazendaId, numero);
  }

  @Get('animal/:animalId/historico')
  listarHistoricoDoAnimal(
    @CurrentUser() user: JwtPayload,
    @Param('animalId', ParseUUIDPipe) animalId: string,
  ) {
    return this.codigoService.listarHistoricoDoAnimal(user.fazendaId, animalId);
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