import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import type { JwtPayload } from '../../auth/auth.service';
import { PapelUsuario } from '../../usuario/entities/usuario.entity';
import { Modulo } from '../acesso/modulo.decorator';
import { ModuloPago } from '../acesso/modulo-pago';
import { ComprasService } from './compras.service';
import { UsosService } from './usos.service';

// Contagens para os avisos do dono (spec 003, FR-016c, R10)
@ApiTags('financeiro')
@ApiBearerAuth()
@Modulo(ModuloPago.FINANCEIRO)
@Roles(PapelUsuario.DONO)
@Controller('modulos/financeiro/pendencias')
export class PendenciasController {
  constructor(
    private readonly usosService: UsosService,
    private readonly comprasService: ComprasService,
  ) {}

  @Get()
  async pendencias(@CurrentUser() user: JwtPayload) {
    const [usosAguardando, comprasSemValor] = await Promise.all([
      this.usosService.contarAguardando(user.fazendaId),
      this.comprasService.contarSemValor(user.fazendaId),
    ]);
    return { usosAguardando, comprasSemValor };
  }
}
