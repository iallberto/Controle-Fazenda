import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../../auth/auth.service';
import { Modulo } from '../acesso/modulo.decorator';
import { ModuloPago } from '../acesso/modulo-pago';
import { ProducaoService } from './producao.service';
import {
  FiltroAnalisesDto,
  FiltroCurvaDto,
  FiltroDiariaDto,
  FiltroEncerradasDto,
} from './dto/leite.dto';

// Relatórios de produção (spec 004, US5); dono e funcionário (só litros)
@ApiTags('leite')
@ApiBearerAuth()
@Modulo(ModuloPago.LEITE)
@Controller('modulos/leite')
export class ProducaoController {
  constructor(private readonly producaoService: ProducaoService) {}

  @Get('producao/diaria')
  diaria(@CurrentUser() user: JwtPayload, @Query() filtro: FiltroDiariaDto) {
    return this.producaoService.diaria(user.fazendaId, filtro.de, filtro.ate);
  }

  @Get('producao/mensal')
  mensal(@CurrentUser() user: JwtPayload, @Query() filtro: FiltroAnalisesDto) {
    return this.producaoService.mensal(user.fazendaId, filtro.de, filtro.ate);
  }

  @Get('vacas/:animalId/curva')
  curva(
    @CurrentUser() user: JwtPayload,
    @Param('animalId', ParseUUIDPipe) animalId: string,
    @Query() filtro: FiltroCurvaDto,
  ) {
    return this.producaoService.curva(user.fazendaId, animalId, filtro.lactacaoId);
  }

  @Get('lactacoes/encerradas')
  encerradas(@CurrentUser() user: JwtPayload, @Query() filtro: FiltroEncerradasDto) {
    return this.producaoService.encerradas(user.fazendaId, filtro.animalId);
  }
}
