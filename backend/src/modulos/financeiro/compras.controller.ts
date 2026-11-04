import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import type { JwtPayload } from '../../auth/auth.service';
import { PapelUsuario } from '../../usuario/entities/usuario.entity';
import { Modulo } from '../acesso/modulo.decorator';
import { ModuloPago } from '../acesso/modulo-pago';
import { ComprasService } from './compras.service';
import { CompraComAnimalDto, ValorCompraDto } from './dto/financeiro.dto';

// Compras de animais. Só o dono (spec 003, FR-016b, FR-016c).
@ApiTags('financeiro')
@ApiBearerAuth()
@Modulo(ModuloPago.FINANCEIRO)
@Roles(PapelUsuario.DONO)
@Controller('modulos/financeiro/compras')
export class ComprasController {
  constructor(private readonly comprasService: ComprasService) {}

  @Post()
  comprar(@CurrentUser() user: JwtPayload, @Body() dto: CompraComAnimalDto) {
    return this.comprasService.comprar(user.fazendaId, user.sub, dto);
  }

  @Get('sem-valor')
  semValor(@CurrentUser() user: JwtPayload) {
    return this.comprasService.semValor(user.fazendaId);
  }

  @Post('animal/:animalId')
  valorarPendente(
    @CurrentUser() user: JwtPayload,
    @Param('animalId', ParseUUIDPipe) animalId: string,
    @Body() dto: ValorCompraDto,
  ) {
    return this.comprasService.valorarPendente(
      user.fazendaId,
      user.sub,
      animalId,
      dto,
    );
  }
}
