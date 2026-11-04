import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import type { JwtPayload } from '../../auth/auth.service';
import { PapelUsuario } from '../../usuario/entities/usuario.entity';
import { Modulo } from '../acesso/modulo.decorator';
import { ModuloPago } from '../acesso/modulo-pago';
import { ResultadoService } from './resultado.service';
import { FiltroResultadoDto } from './dto/financeiro.dto';

// Resultado da fazenda. Só o dono (spec 003, FR-002, US3).
@ApiTags('financeiro')
@ApiBearerAuth()
@Modulo(ModuloPago.FINANCEIRO)
@Roles(PapelUsuario.DONO)
@Controller('modulos/financeiro/resultado')
export class ResultadoController {
  constructor(private readonly resultadoService: ResultadoService) {}

  @Get('mensal')
  mensal(@CurrentUser() user: JwtPayload, @Query() f: FiltroResultadoDto) {
    return this.resultadoService.mensal(user.fazendaId, f.de, f.ate);
  }

  @Get('despesas-por-categoria')
  despesas(@CurrentUser() user: JwtPayload, @Query() f: FiltroResultadoDto) {
    return this.resultadoService.despesasPorCategoria(
      user.fazendaId,
      f.de,
      f.ate,
    );
  }

  @Get('vendas')
  vendas(@CurrentUser() user: JwtPayload, @Query() f: FiltroResultadoDto) {
    return this.resultadoService.vendas(user.fazendaId, f.de, f.ate);
  }
}
