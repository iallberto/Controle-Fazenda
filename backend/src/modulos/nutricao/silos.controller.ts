import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import type { JwtPayload } from '../../auth/auth.service';
import { PapelUsuario } from '../../usuario/entities/usuario.entity';
import { Modulo } from '../acesso/modulo.decorator';
import { ModuloPago } from '../acesso/modulo-pago';
import { SilosService } from './silos.service';
import {
  CriarSiloDto,
  DataObrigatoriaDto,
  EditarSiloDto,
  MotivoNutricaoDto,
} from './dto/nutricao.dto';

// Silos (spec 005, US3): o dono cadastra, edita e encerra; dono e funcionário
// abrem e veem o saldo e a previsão
@ApiTags('nutricao')
@ApiBearerAuth()
@Modulo(ModuloPago.NUTRICAO)
@Controller('modulos/nutricao/silos')
export class SilosController {
  constructor(private readonly silosService: SilosService) {}

  @Get()
  listar(@CurrentUser() user: JwtPayload) {
    return this.silosService.listar(user.fazendaId, user.papel);
  }

  @Roles(PapelUsuario.DONO)
  @Post()
  criar(@CurrentUser() user: JwtPayload, @Body() dto: CriarSiloDto) {
    return this.silosService.criar(user.fazendaId, user.sub, dto);
  }

  @Roles(PapelUsuario.DONO)
  @Patch(':id')
  editar(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EditarSiloDto,
  ) {
    return this.silosService.editar(user.fazendaId, user.sub, id, dto);
  }

  @Post(':id/abrir')
  abrir(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DataObrigatoriaDto,
  ) {
    return this.silosService.abrir(user.fazendaId, user.sub, id, dto.data);
  }

  @Post(':id/cancelar-abertura')
  cancelarAbertura(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MotivoNutricaoDto,
  ) {
    return this.silosService.cancelarAbertura(user.fazendaId, user.sub, id, dto.motivo);
  }

  @Roles(PapelUsuario.DONO)
  @Post(':id/encerrar')
  encerrar(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DataObrigatoriaDto,
  ) {
    return this.silosService.encerrar(user.fazendaId, user.sub, id, dto.data);
  }
}
