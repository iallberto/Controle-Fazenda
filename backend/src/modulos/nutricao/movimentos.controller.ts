import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../../auth/auth.service';
import { Modulo } from '../acesso/modulo.decorator';
import { ModuloPago } from '../acesso/modulo-pago';
import { MovimentosService } from './movimentos.service';
import { BaixaDto, EntradaDto, MotivoNutricaoDto } from './dto/nutricao.dto';

// Entradas e baixas de insumo (spec 005, US1); dono e funcionário. Valor na
// entrada só o dono (403 para o funcionário).
@ApiTags('nutricao')
@ApiBearerAuth()
@Modulo(ModuloPago.NUTRICAO)
@Controller('modulos/nutricao')
export class MovimentosController {
  constructor(private readonly movimentosService: MovimentosService) {}

  @Post('entradas')
  entrada(@CurrentUser() user: JwtPayload, @Body() dto: EntradaDto) {
    return this.movimentosService.entrada(user.fazendaId, user.sub, user.papel, dto);
  }

  @Post('baixas')
  baixa(@CurrentUser() user: JwtPayload, @Body() dto: BaixaDto) {
    return this.movimentosService.baixa(user.fazendaId, user.sub, dto);
  }

  @Post('movimentos/:id/cancelar')
  cancelar(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MotivoNutricaoDto,
  ) {
    return this.movimentosService.cancelar(user.fazendaId, user.sub, id, dto.motivo);
  }
}
