import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import type { JwtPayload } from '../../auth/auth.service';
import { PapelUsuario } from '../../usuario/entities/usuario.entity';
import { Modulo } from '../acesso/modulo.decorator';
import { ModuloPago } from '../acesso/modulo-pago';
import { VacasService } from './vacas.service';
import { FiltroVacasDto, VacaDeLeiteDto } from './dto/leite.dto';

// Vacas de leite e situação leiteira (spec 004, US1)
@ApiTags('leite')
@ApiBearerAuth()
@Modulo(ModuloPago.LEITE)
@Controller('modulos/leite/vacas')
export class VacasController {
  constructor(private readonly vacasService: VacasService) {}

  @Get()
  listar(@CurrentUser() user: JwtPayload, @Query() filtro: FiltroVacasDto) {
    return this.vacasService.listar(user.fazendaId, filtro.situacao);
  }

  @Get(':animalId')
  detalhar(
    @CurrentUser() user: JwtPayload,
    @Param('animalId', ParseUUIDPipe) animalId: string,
  ) {
    return this.vacasService.detalhar(user.fazendaId, animalId);
  }

  @Roles(PapelUsuario.DONO)
  @Patch(':animalId/vaca-de-leite')
  vacaDeLeite(
    @CurrentUser() user: JwtPayload,
    @Param('animalId', ParseUUIDPipe) animalId: string,
    @Body() dto: VacaDeLeiteDto,
  ) {
    return this.vacasService.alterarVacaDeLeite(
      user.fazendaId,
      user.sub,
      animalId,
      dto.vacaDeLeite,
    );
  }
}
