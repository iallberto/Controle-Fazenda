import { Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Modulo } from '../acesso/modulo.decorator';
import { ModuloPago } from '../acesso/modulo-pago';

// Rotas de exemplo só para provar o bloqueio enquanto o módulo real não existe
// (spec 002, FR-012). REMOVER quando o módulo Nutricao for implementado.
@ApiTags('modulos')
@ApiBearerAuth()
@Modulo(ModuloPago.NUTRICAO)
@Controller('modulos/nutricao/exemplo')
export class NutricaoExemploController {
  @Get()
  consultar() {
    return { modulo: ModuloPago.NUTRICAO, acao: 'CONSULTA', ok: true };
  }

  @Post()
  lancar() {
    return { modulo: ModuloPago.NUTRICAO, acao: 'LANCAMENTO', ok: true };
  }
}
