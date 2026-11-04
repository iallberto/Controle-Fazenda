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
import { LancamentosService } from './lancamentos.service';
import {
  CriarLancamentoDto,
  EditarLancamentoDto,
  FiltroLancamentosDto,
  MotivoDto,
} from './dto/financeiro.dto';

// Receitas e despesas. Só o dono (spec 003, FR-002).
@ApiTags('financeiro')
@ApiBearerAuth()
@Modulo(ModuloPago.FINANCEIRO)
@Roles(PapelUsuario.DONO)
@Controller('modulos/financeiro/lancamentos')
export class LancamentosController {
  constructor(private readonly lancamentosService: LancamentosService) {}

  @Get()
  listar(
    @CurrentUser() user: JwtPayload,
    @Query() filtro: FiltroLancamentosDto,
  ) {
    return this.lancamentosService.listarMes(user.fazendaId, filtro);
  }

  @Post()
  criar(@CurrentUser() user: JwtPayload, @Body() dto: CriarLancamentoDto) {
    return this.lancamentosService.criar(user.fazendaId, user.sub, dto);
  }

  @Patch(':id')
  editar(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EditarLancamentoDto,
  ) {
    return this.lancamentosService.editar(user.fazendaId, user.sub, id, dto);
  }

  @Post(':id/cancelar')
  cancelar(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MotivoDto,
  ) {
    return this.lancamentosService.cancelar(
      user.fazendaId,
      user.sub,
      id,
      dto.motivo,
    );
  }
}
