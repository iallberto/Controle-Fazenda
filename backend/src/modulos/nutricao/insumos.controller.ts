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
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import type { JwtPayload } from '../../auth/auth.service';
import { PapelUsuario } from '../../usuario/entities/usuario.entity';
import { Modulo } from '../acesso/modulo.decorator';
import { ModuloPago } from '../acesso/modulo-pago';
import { InsumosService } from './insumos.service';
import {
  CriarInsumoDto,
  CriarUnidadeDto,
  EditarInsumoDto,
  EditarUnidadeDto,
  FiltroInativosDto,
} from './dto/nutricao.dto';

// Insumos e estoque (spec 005, US1). Cadastro só do dono; leitura de todos
// (o funcionário não recebe valores).
@ApiTags('nutricao')
@ApiBearerAuth()
@Modulo(ModuloPago.NUTRICAO)
@Controller('modulos/nutricao/insumos')
export class InsumosController {
  constructor(private readonly insumosService: InsumosService) {}

  @Get()
  listar(@CurrentUser() user: JwtPayload, @Query() filtro: FiltroInativosDto) {
    return this.insumosService.listar(user.fazendaId, user.papel, filtro.incluirInativos === 'true');
  }

  @Roles(PapelUsuario.DONO)
  @Post()
  criar(@CurrentUser() user: JwtPayload, @Body() dto: CriarInsumoDto) {
    return this.insumosService.criar(user.fazendaId, user.sub, dto);
  }

  @Roles(PapelUsuario.DONO)
  @Patch(':id')
  editar(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EditarInsumoDto,
  ) {
    return this.insumosService.editar(user.fazendaId, user.sub, id, dto);
  }

  @Roles(PapelUsuario.DONO)
  @Post(':id/unidades')
  criarUnidade(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CriarUnidadeDto,
  ) {
    return this.insumosService.criarUnidade(user.fazendaId, user.sub, id, dto);
  }

  @Roles(PapelUsuario.DONO)
  @Patch(':id/unidades/:unidadeId')
  editarUnidade(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('unidadeId', ParseUUIDPipe) unidadeId: string,
    @Body() dto: EditarUnidadeDto,
  ) {
    return this.insumosService.editarUnidade(user.fazendaId, user.sub, id, unidadeId, dto.ativa);
  }

  @Get(':id/movimentos')
  movimentos(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.insumosService.movimentos(user.fazendaId, user.papel, id);
  }
}
