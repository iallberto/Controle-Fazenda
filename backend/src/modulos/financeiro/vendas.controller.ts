import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import type { JwtPayload } from '../../auth/auth.service';
import { PapelUsuario } from '../../usuario/entities/usuario.entity';
import { Modulo } from '../acesso/modulo.decorator';
import { ModuloPago } from '../acesso/modulo-pago';
import { VendasService } from './vendas.service';
import {
  FiltroAnimaisVendaDto,
  FiltroPeriodoDto,
  MotivoDto,
  VendaDto,
} from './dto/financeiro.dto';

// Venda de animais. Só o dono (spec 003, FR-002).
@ApiTags('financeiro')
@ApiBearerAuth()
@Modulo(ModuloPago.FINANCEIRO)
@Roles(PapelUsuario.DONO)
@Controller('modulos/financeiro/vendas')
export class VendasController {
  constructor(private readonly vendasService: VendasService) {}

  // Antes de ':id' para não ser lida como um id
  @Get('animais-disponiveis')
  animaisDisponiveis(
    @CurrentUser() user: JwtPayload,
    @Query() filtro: FiltroAnimaisVendaDto,
  ) {
    return this.vendasService.animaisDisponiveis(user.fazendaId, filtro);
  }

  @Get('animal/:animalId')
  vendaDoAnimal(
    @CurrentUser() user: JwtPayload,
    @Param('animalId', ParseUUIDPipe) animalId: string,
  ) {
    return this.vendasService.vendaDoAnimal(user.fazendaId, animalId);
  }

  @Post('simular')
  @HttpCode(HttpStatus.OK)
  simular(@CurrentUser() user: JwtPayload, @Body() dto: VendaDto) {
    return this.vendasService.simular(user.fazendaId, dto);
  }

  @Post()
  registrar(@CurrentUser() user: JwtPayload, @Body() dto: VendaDto) {
    return this.vendasService.registrar(user.fazendaId, user.sub, dto);
  }

  @Get()
  listar(@CurrentUser() user: JwtPayload, @Query() periodo: FiltroPeriodoDto) {
    return this.vendasService.listar(user.fazendaId, periodo);
  }

  @Get(':id')
  detalhar(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.vendasService.detalhar(user.fazendaId, id);
  }

  @Post(':id/cancelar')
  cancelar(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MotivoDto,
  ) {
    return this.vendasService.cancelar(
      user.fazendaId,
      user.sub,
      id,
      dto.motivo,
    );
  }
}
