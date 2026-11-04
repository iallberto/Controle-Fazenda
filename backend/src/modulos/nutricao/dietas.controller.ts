import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import type { JwtPayload } from '../../auth/auth.service';
import { PapelUsuario } from '../../usuario/entities/usuario.entity';
import { Modulo } from '../acesso/modulo.decorator';
import { ModuloPago } from '../acesso/modulo-pago';
import { DietasService } from './dietas.service';
import { AtivaDto, DietaDto } from './dto/nutricao.dto';

// Dietas (spec 005, US2): todos leem; só o dono altera
@ApiTags('nutricao')
@ApiBearerAuth()
@Modulo(ModuloPago.NUTRICAO)
@Controller('modulos/nutricao/dietas')
export class DietasController {
  constructor(private readonly dietasService: DietasService) {}

  @Get()
  listar(@CurrentUser() user: JwtPayload) {
    return this.dietasService.listar(user.fazendaId);
  }

  @Roles(PapelUsuario.DONO)
  @Post()
  criar(@CurrentUser() user: JwtPayload, @Body() dto: DietaDto) {
    return this.dietasService.criar(user.fazendaId, user.sub, dto);
  }

  @Roles(PapelUsuario.DONO)
  @Put(':id')
  substituir(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DietaDto,
  ) {
    return this.dietasService.substituir(user.fazendaId, user.sub, id, dto);
  }

  @Roles(PapelUsuario.DONO)
  @Patch(':id')
  ativar(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtivaDto,
  ) {
    return this.dietasService.ativar(user.fazendaId, user.sub, id, dto.ativa);
  }
}
