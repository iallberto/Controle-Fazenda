import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConsultaPublicaService } from './consulta-publica.service';
import { Public } from '../auth/decorators/public.decorator';
import { LimitePorIpGuard } from '../common/limite-por-ip.guard';

// Consulta aberta a quem escanear o QR da etiqueta (comprador, visitante).
@ApiTags('consulta-publica')
@Controller('publico')
export class ConsultaPublicaController {
  constructor(private readonly consultaPublicaService: ConsultaPublicaService) {}

  @Public()
  @UseGuards(LimitePorIpGuard)
  @Get('animal/:codigo')
  consultar(@Param('codigo') codigo: string) {
    return this.consultaPublicaService.consultar(codigo);
  }
}
