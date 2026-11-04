import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { PapelUsuario } from '../usuario/entities/usuario.entity';
import type { JwtPayload } from '../auth/auth.service';
import { EstacaoService } from './estacao.service';
import { SituacaoService } from './situacao.service';
import { DiagnosticoService } from './diagnostico.service';
import {
  AbrirEstacaoDto,
  CancelarDto,
  EditarEstacaoDto,
  EncerrarEstacaoDto,
  FiltroAptasDto,
  FiltroEstacoesDto,
  IncluirFemeasDto,
} from './dto/estacao.dto';
import {
  DiagnosticoDto,
  DiagnosticoLoteDto,
  EditarDiagnosticoDto,
  FiltroGrupoDiagnosticoDto,
  PerdaDto,
} from './dto/diagnostico.dto';

@ApiTags('reproducao')
@ApiBearerAuth()
@Controller('reproducao')
export class ReproducaoController {
  constructor(
    private readonly estacaoService: EstacaoService,
    private readonly situacaoService: SituacaoService,
    private readonly diagnosticoService: DiagnosticoService,
  ) {}

  // --- Estações de monta (US1) -----------------------------------------------

  @Get('estacoes')
  listarEstacoes(
    @CurrentUser() user: JwtPayload,
    @Query() filtro: FiltroEstacoesDto,
  ) {
    return this.estacaoService.listar(user.fazendaId, filtro.situacao);
  }

  // Antes de 'estacoes/:id' para não ser lida como um id
  @Get('estacoes/aptas')
  async listarAptas(
    @CurrentUser() user: JwtPayload,
    @Query() filtro: FiltroAptasDto,
  ) {
    const aptas = await this.situacaoService.listarAptas(
      user.fazendaId,
      { pastoId: filtro.pastoId, categoria: filtro.categoria },
      filtro.data,
    );
    return aptas.map((femea) => ({
      id: femea.id,
      brinco: femea.brinco,
      categoria: femea.categoria,
      statusReprodutivo: femea.statusReprodutivo,
    }));
  }

  @Get('estacoes/:id')
  detalharEstacao(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.estacaoService.detalhar(user.fazendaId, id);
  }

  @Post('estacoes')
  abrirEstacao(@CurrentUser() user: JwtPayload, @Body() dto: AbrirEstacaoDto) {
    return this.estacaoService.abrir(user.fazendaId, user.sub, dto);
  }

  @Post('estacoes/:id/femeas')
  incluirFemeas(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: IncluirFemeasDto,
  ) {
    return this.estacaoService.incluirFemeas(user.fazendaId, user.sub, id, dto);
  }

  @Post('estacoes/:id/encerrar')
  encerrarEstacao(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EncerrarEstacaoDto,
  ) {
    return this.estacaoService.encerrar(user.fazendaId, user.sub, id, dto);
  }

  @Roles(PapelUsuario.DONO)
  @Patch('estacoes/:id')
  editarEstacao(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EditarEstacaoDto,
  ) {
    return this.estacaoService.editar(user.fazendaId, user.sub, id, dto);
  }

  @Roles(PapelUsuario.DONO)
  @Post('estacoes/:id/cancelar')
  cancelarEstacao(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelarDto,
  ) {
    return this.estacaoService.cancelar(
      user.fazendaId,
      user.sub,
      id,
      dto.motivo,
    );
  }

  @Roles(PapelUsuario.DONO)
  @Post('exposicoes/:id/cancelar')
  cancelarExposicao(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelarDto,
  ) {
    return this.estacaoService.cancelarExposicao(
      user.fazendaId,
      user.sub,
      id,
      dto.motivo,
    );
  }

  // --- Diagnóstico de gestação (US2) ------------------------------------------

  @Get('diagnosticos/grupo')
  listarGrupoDiagnostico(
    @CurrentUser() user: JwtPayload,
    @Query() filtro: FiltroGrupoDiagnosticoDto,
  ) {
    return this.diagnosticoService.listarGrupo(user.fazendaId, filtro);
  }

  @Post('diagnosticos')
  registrarDiagnostico(
    @CurrentUser() user: JwtPayload,
    @Body() dto: DiagnosticoDto,
  ) {
    return this.diagnosticoService.registrar(user.fazendaId, user.sub, dto);
  }

  @Post('diagnosticos/lote')
  registrarDiagnosticoLote(
    @CurrentUser() user: JwtPayload,
    @Body() dto: DiagnosticoLoteDto,
  ) {
    return this.diagnosticoService.registrarLote(user.fazendaId, user.sub, dto);
  }

  @Post('perdas')
  registrarPerda(@CurrentUser() user: JwtPayload, @Body() dto: PerdaDto) {
    return this.diagnosticoService.registrarPerda(
      user.fazendaId,
      user.sub,
      dto,
    );
  }

  @Roles(PapelUsuario.DONO)
  @Patch('diagnosticos/:id')
  editarDiagnostico(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EditarDiagnosticoDto,
  ) {
    return this.diagnosticoService.editar(user.fazendaId, user.sub, id, dto);
  }

  @Roles(PapelUsuario.DONO)
  @Post('diagnosticos/:id/cancelar')
  cancelarDiagnostico(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelarDto,
  ) {
    return this.diagnosticoService.cancelar(
      user.fazendaId,
      user.sub,
      id,
      dto.motivo,
    );
  }

  // --- Situação do animal -----------------------------------------------------

  @Get('animais/:id/candidatos-pai')
  candidatosPai(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() filtro: FiltroAptasDto,
  ) {
    return this.situacaoService.candidatosPai(user.fazendaId, id, filtro.data);
  }

  @Get('animais/:id/situacao')
  situacao(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.situacaoService.situacao(user.fazendaId, id);
  }
}
