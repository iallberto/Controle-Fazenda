import { Body, Controller, Get, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../../auth/auth.service';
import { Modulo } from '../acesso/modulo.decorator';
import { ModuloPago } from '../acesso/modulo-pago';
import { OrdenhasService } from './ordenhas.service';
import {
  DiaDto,
  OrdenhaTanqueDto,
  OrdenhaVacaDto,
  TurnoDto,
} from './dto/leite.dto';

// Ordenha do dia (spec 004, US1 e US2); dono e funcionário
@ApiTags('leite')
@ApiBearerAuth()
@Modulo(ModuloPago.LEITE)
@Controller('modulos/leite/ordenhas')
export class OrdenhasController {
  constructor(private readonly ordenhasService: OrdenhasService) {}

  @Get('turno')
  turno(@CurrentUser() user: JwtPayload, @Query() filtro: TurnoDto) {
    return this.ordenhasService.turno(user.fazendaId, user.sub, filtro);
  }

  @Put('vaca')
  gravarVaca(@CurrentUser() user: JwtPayload, @Body() dto: OrdenhaVacaDto) {
    return this.ordenhasService.gravarVaca(user.fazendaId, user.sub, dto);
  }

  @Put('tanque')
  gravarTanque(
    @CurrentUser() user: JwtPayload,
    @Body() dto: OrdenhaTanqueDto,
  ) {
    return this.ordenhasService.gravarTanque(user.fazendaId, user.sub, dto);
  }

  @Get('dia')
  dia(@CurrentUser() user: JwtPayload, @Query() filtro: DiaDto) {
    return this.ordenhasService.dia(user.fazendaId, filtro.data);
  }
}
