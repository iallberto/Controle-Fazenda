import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../../auth/auth.service';
import { Modulo } from '../acesso/modulo.decorator';
import { ModuloPago } from '../acesso/modulo-pago';
import { FornecimentosService } from './fornecimentos.service';
import {
  FiltroPeriodoDto,
  FiltroSugestaoDto,
  FornecimentoDto,
  MotivoNutricaoDto,
} from './dto/nutricao.dto';

// Fornecimento do dia (spec 005, US2); dono e funcionário
@ApiTags('nutricao')
@ApiBearerAuth()
@Modulo(ModuloPago.NUTRICAO)
@Controller('modulos/nutricao/fornecimentos')
export class FornecimentosController {
  constructor(private readonly fornecimentosService: FornecimentosService) {}

  @Get('sugestao')
  sugestao(@CurrentUser() user: JwtPayload, @Query() filtro: FiltroSugestaoDto) {
    return this.fornecimentosService.sugestao(user.fazendaId, filtro.loteId, filtro.data);
  }

  @Post()
  gravar(@CurrentUser() user: JwtPayload, @Body() dto: FornecimentoDto) {
    return this.fornecimentosService.gravar(user.fazendaId, user.sub, dto);
  }

  @Get()
  listar(@CurrentUser() user: JwtPayload, @Query() filtro: FiltroPeriodoDto) {
    return this.fornecimentosService.listar(user.fazendaId, filtro, user.papel);
  }

  @Post(':id/cancelar')
  cancelar(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MotivoNutricaoDto,
  ) {
    return this.fornecimentosService.cancelar(user.fazendaId, user.sub, id, dto.motivo);
  }
}
