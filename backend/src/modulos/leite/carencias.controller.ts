import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../../auth/auth.service';
import { Modulo } from '../acesso/modulo.decorator';
import { ModuloPago } from '../acesso/modulo-pago';
import { CarenciasService } from './carencias.service';

// Leite em descarte hoje (spec 004, FR-018)
@ApiTags('leite')
@ApiBearerAuth()
@Modulo(ModuloPago.LEITE)
@Controller('modulos/leite/carencias')
export class CarenciasController {
  constructor(private readonly carenciasService: CarenciasService) {}

  @Get()
  hoje(@CurrentUser() user: JwtPayload) {
    return this.carenciasService.hoje(user.fazendaId);
  }
}
