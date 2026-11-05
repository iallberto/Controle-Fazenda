import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import type { JwtPayload } from '../../auth/auth.service';
import { PapelUsuario } from '../../usuario/entities/usuario.entity';
import { Modulo } from '../acesso/modulo.decorator';
import { ModuloPago } from '../acesso/modulo-pago';
import { CustoService } from './custo.service';
import { FiltroPeriodoDto, PrecoEntradaDto } from './dto/nutricao.dto';

// Preço das entradas, pendências e custo da alimentação (spec 005, US4). Só o dono.
@ApiTags('nutricao')
@ApiBearerAuth()
@Modulo(ModuloPago.NUTRICAO)
@Roles(PapelUsuario.DONO)
@Controller('modulos/nutricao')
export class CustoController {
  constructor(private readonly custoService: CustoService) {}

  @Get('entradas/aguardando-preco')
  aguardandoPreco(@CurrentUser() user: JwtPayload) {
    return this.custoService.aguardandoPreco(user.fazendaId);
  }

  @Post('entradas/:id/preco')
  preco(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PrecoEntradaDto,
  ) {
    return this.custoService.informarPreco(user.fazendaId, user.sub, id, dto.valorCentavos);
  }

  @Get('pendencias')
  pendencias(@CurrentUser() user: JwtPayload) {
    return this.custoService.pendencias(user.fazendaId);
  }

  @Get('custo')
  custo(@CurrentUser() user: JwtPayload, @Query() filtro: FiltroPeriodoDto) {
    return this.custoService.custo(user.fazendaId, filtro);
  }
}
