import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ManejoLoteService } from './manejo-lote.service';
import {
  FiltroGrupoDto,
  PastoEmLoteDto,
  TratamentoEmLoteDto,
} from './dto/manejo-lote.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/auth.service';

@ApiTags('manejo-lote')
@ApiBearerAuth()
@Controller('manejo-lote')
export class ManejoLoteController {
  constructor(private readonly manejoLoteService: ManejoLoteService) {}

  // Animais ativos do grupo, para a tela marcar e desmarcar
  @Get('grupo')
  listarGrupo(
    @CurrentUser() user: JwtPayload,
    @Query() filtro: FiltroGrupoDto,
  ) {
    return this.manejoLoteService.listarGrupo(user.fazendaId, filtro);
  }

  @Post('tratamento')
  tratamento(
    @CurrentUser() user: JwtPayload,
    @Body() dto: TratamentoEmLoteDto,
  ) {
    return this.manejoLoteService.tratamentoEmLote(
      user.fazendaId,
      user.sub,
      dto,
    );
  }

  @Post('pasto')
  pasto(@CurrentUser() user: JwtPayload, @Body() dto: PastoEmLoteDto) {
    return this.manejoLoteService.pastoEmLote(user.fazendaId, user.sub, dto);
  }

  @Get('sessoes')
  listarSessoes(@CurrentUser() user: JwtPayload) {
    return this.manejoLoteService.listarSessoes(user.fazendaId);
  }
}
