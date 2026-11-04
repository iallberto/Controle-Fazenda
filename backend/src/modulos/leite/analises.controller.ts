import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PartialType } from '@nestjs/mapped-types';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../../auth/auth.service';
import { Modulo } from '../acesso/modulo.decorator';
import { ModuloPago } from '../acesso/modulo-pago';
import { AnalisesService } from './analises.service';
import {
  CriarAnaliseDto,
  FiltroAnalisesDto,
  MotivoLeiteDto,
} from './dto/leite.dto';

class EditarAnaliseDto extends PartialType(CriarAnaliseDto) {}

// Análises do laticínio (spec 004, US4); dono e funcionário
@ApiTags('leite')
@ApiBearerAuth()
@Modulo(ModuloPago.LEITE)
@Controller('modulos/leite/analises')
export class AnalisesController {
  constructor(private readonly analisesService: AnalisesService) {}

  @Get()
  listar(@CurrentUser() user: JwtPayload, @Query() filtro: FiltroAnalisesDto) {
    return this.analisesService.listar(user.fazendaId, filtro.de, filtro.ate);
  }

  @Post()
  criar(@CurrentUser() user: JwtPayload, @Body() dto: CriarAnaliseDto) {
    return this.analisesService.criar(user.fazendaId, user.sub, dto);
  }

  @Patch(':id')
  editar(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EditarAnaliseDto,
  ) {
    return this.analisesService.editar(user.fazendaId, user.sub, id, dto);
  }

  @Post(':id/cancelar')
  cancelar(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MotivoLeiteDto,
  ) {
    return this.analisesService.cancelar(user.fazendaId, user.sub, id, dto.motivo);
  }
}
