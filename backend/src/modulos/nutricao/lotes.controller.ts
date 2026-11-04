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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import type { JwtPayload } from '../../auth/auth.service';
import { PapelUsuario } from '../../usuario/entities/usuario.entity';
import { Modulo } from '../acesso/modulo.decorator';
import { ModuloPago } from '../acesso/modulo-pago';
import { LotesService } from './lotes.service';
import {
  AnimaisDoLoteDto,
  CriarLoteDto,
  EditarLoteDto,
  FiltroDataDto,
  FiltroInativosDto,
} from './dto/nutricao.dto';

// Lotes de alimentação (spec 005, US2): o dono cria, renomeia, desativa e
// escolhe a dieta; dono e funcionário incluem e tiram animais
@ApiTags('nutricao')
@ApiBearerAuth()
@Modulo(ModuloPago.NUTRICAO)
@Controller('modulos/nutricao/lotes')
export class LotesController {
  constructor(private readonly lotesService: LotesService) {}

  @Get()
  listar(@CurrentUser() user: JwtPayload, @Query() filtro: FiltroInativosDto) {
    return this.lotesService.listar(user.fazendaId, filtro.incluirInativos === 'true');
  }

  @Get(':id')
  detalhar(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() filtro: FiltroDataDto,
  ) {
    return this.lotesService.detalhar(user.fazendaId, id, filtro.data);
  }

  @Roles(PapelUsuario.DONO)
  @Post()
  criar(@CurrentUser() user: JwtPayload, @Body() dto: CriarLoteDto) {
    return this.lotesService.criar(user.fazendaId, user.sub, dto);
  }

  @Roles(PapelUsuario.DONO)
  @Patch(':id')
  editar(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EditarLoteDto,
  ) {
    return this.lotesService.editar(user.fazendaId, user.sub, id, dto);
  }

  @Post(':id/animais')
  incluir(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AnimaisDoLoteDto,
  ) {
    return this.lotesService.incluir(user.fazendaId, user.sub, id, dto.animalIds, dto.data);
  }

  @Post(':id/animais/remover')
  remover(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AnimaisDoLoteDto,
  ) {
    return this.lotesService.remover(user.fazendaId, user.sub, id, dto.animalIds, dto.data);
  }
}
