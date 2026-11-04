import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../../auth/auth.service';
import { Modulo } from '../acesso/modulo.decorator';
import { ModuloPago } from '../acesso/modulo-pago';
import { SecagensService } from './secagens.service';
import {
  FiltroASecarDto,
  MotivoLeiteDto,
  RegistrarSecagemDto,
} from './dto/leite.dto';

// Secagem (spec 004, US3); dono e funcionário
@ApiTags('leite')
@ApiBearerAuth()
@Modulo(ModuloPago.LEITE)
@Controller('modulos/leite/secagens')
export class SecagensController {
  constructor(private readonly secagensService: SecagensService) {}

  @Get('a-secar')
  aSecar(@CurrentUser() user: JwtPayload, @Query() filtro: FiltroASecarDto) {
    return this.secagensService.aSecar(user.fazendaId, filtro.dias);
  }

  @Post()
  registrar(@CurrentUser() user: JwtPayload, @Body() dto: RegistrarSecagemDto) {
    return this.secagensService.registrar(user.fazendaId, user.sub, dto);
  }

  @Post(':id/cancelar')
  cancelar(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MotivoLeiteDto,
  ) {
    return this.secagensService.cancelar(user.fazendaId, user.sub, id, dto.motivo);
  }
}
