import { Controller, Get, Post, Body, Patch, Param, Query, Put } from '@nestjs/common';
import { ConfiguracaoService } from './configuracao.service';
import { AtualizarPreferenciasDto } from './dto/atualizar-preferencias.dto';
import { AtualizarValorArrobaDto } from './dto/atualizar-valor-arroba.dto';
import { CategoriaAnimal } from '../animal/entities/animal.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/auth.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('configuracao')
@ApiBearerAuth()
@Controller('configuracao')
export class ConfiguracaoController {
  constructor(private readonly configuracaoService: ConfiguracaoService) {}

  @Get()
  obter(@CurrentUser() user: JwtPayload) {
    return this.configuracaoService.obterOuCriar(user.fazendaId);
  }

  @Patch()
  atualizarPreferencias(
    @CurrentUser() user: JwtPayload,
    @Body() dto: AtualizarPreferenciasDto,
  ) {
    return this.configuracaoService.atualizarPreferencias(user.fazendaId, dto);
  }

  @Put('arroba/:categoria')
  atualizarValorArroba(
    @CurrentUser() user: JwtPayload,
    @Param('categoria') categoria: CategoriaAnimal,
    @Body() dto: AtualizarValorArrobaDto,
  ) {
    return this.configuracaoService.atualizarValorArroba(user.fazendaId, categoria, dto);
  }
}