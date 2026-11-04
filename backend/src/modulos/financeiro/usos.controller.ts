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
import { Roles } from '../../auth/decorators/roles.decorator';
import type { JwtPayload } from '../../auth/auth.service';
import { PapelUsuario } from '../../usuario/entities/usuario.entity';
import { Modulo } from '../acesso/modulo.decorator';
import { ModuloPago } from '../acesso/modulo-pago';
import { SituacaoUso } from './entities/registro-uso.entity';
import { UsosService } from './usos.service';
import {
  FiltroUsosDto,
  MotivoDto,
  RegistrarUsoDto,
  ValorarDto,
} from './dto/financeiro.dto';

// Registros de uso (spec 003, US4). Dono e funcionário registram e veem a
// lista, sem valores; valorar e descartar são só do dono (FR-022 a FR-025).
@ApiTags('financeiro')
@ApiBearerAuth()
@Modulo(ModuloPago.FINANCEIRO)
@Controller('modulos/financeiro/usos')
export class UsosController {
  constructor(private readonly usosService: UsosService) {}

  @Get()
  listar(@CurrentUser() user: JwtPayload, @Query() filtro: FiltroUsosDto) {
    return this.usosService.listar(
      user.fazendaId,
      filtro.situacao as SituacaoUso | undefined,
    );
  }

  @Get('categorias')
  categorias(@CurrentUser() user: JwtPayload) {
    return this.usosService.categorias(user.fazendaId);
  }

  @Post()
  registrar(@CurrentUser() user: JwtPayload, @Body() dto: RegistrarUsoDto) {
    return this.usosService.registrar(user.fazendaId, user.sub, dto);
  }

  @Roles(PapelUsuario.DONO)
  @Post(':id/valorar')
  valorar(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ValorarDto,
  ) {
    return this.usosService.valorar(
      user.fazendaId,
      user.sub,
      id,
      dto.valorCentavos,
    );
  }

  @Roles(PapelUsuario.DONO)
  @Post(':id/descartar')
  descartar(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MotivoDto,
  ) {
    return this.usosService.descartar(user.fazendaId, user.sub, id, dto.motivo);
  }
}
