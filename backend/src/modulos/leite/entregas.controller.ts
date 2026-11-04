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
import { EntregasService } from './entregas.service';
import {
  CriarEntregaDto,
  EditarEntregaDto,
  FiltroMesDto,
  MotivoLeiteDto,
  PrecoDoMesDto,
  PrecoEntregaDto,
} from './dto/leite.dto';

// Entregas ao laticínio (spec 004, US4). Dono e funcionário lançam litros;
// preço e valor só o dono (FR-002).
@ApiTags('leite')
@ApiBearerAuth()
@Modulo(ModuloPago.LEITE)
@Controller('modulos/leite/entregas')
export class EntregasController {
  constructor(private readonly entregasService: EntregasService) {}

  @Get()
  listar(@CurrentUser() user: JwtPayload, @Query() filtro: FiltroMesDto) {
    return this.entregasService.listar(user.fazendaId, user.papel, filtro.mes);
  }

  @Post()
  criar(@CurrentUser() user: JwtPayload, @Body() dto: CriarEntregaDto) {
    return this.entregasService.criar(user.fazendaId, user.sub, user.papel, dto);
  }

  @Roles(PapelUsuario.DONO)
  @Post('preco-do-mes')
  precoDoMes(@CurrentUser() user: JwtPayload, @Body() dto: PrecoDoMesDto) {
    return this.entregasService.informarPrecoDoMes(
      user.fazendaId,
      user.sub,
      dto.mes,
      dto.precoLitroCentavos,
    );
  }

  @Patch(':id')
  editar(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EditarEntregaDto,
  ) {
    return this.entregasService.editar(user.fazendaId, user.sub, id, dto);
  }

  @Post(':id/cancelar')
  cancelar(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MotivoLeiteDto,
  ) {
    return this.entregasService.cancelar(user.fazendaId, user.sub, id, dto.motivo);
  }

  @Roles(PapelUsuario.DONO)
  @Post(':id/preco')
  preco(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PrecoEntregaDto,
  ) {
    return this.entregasService.informarPreco(
      user.fazendaId,
      user.sub,
      id,
      dto.precoLitroCentavos,
    );
  }
}
