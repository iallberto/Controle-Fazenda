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
import { CategoriasService } from './categorias.service';
import {
  CriarCategoriaDto,
  EditarCategoriaDto,
  FiltroCategoriasDto,
} from './dto/financeiro.dto';

// Categorias de receita e despesa. Só o dono (spec 003, FR-002).
@ApiTags('financeiro')
@ApiBearerAuth()
@Modulo(ModuloPago.FINANCEIRO)
@Roles(PapelUsuario.DONO)
@Controller('modulos/financeiro/categorias')
export class CategoriasController {
  constructor(private readonly categoriasService: CategoriasService) {}

  @Get()
  listar(
    @CurrentUser() user: JwtPayload,
    @Query() filtro: FiltroCategoriasDto,
  ) {
    return this.categoriasService.listar(user.fazendaId, {
      tipo: filtro.tipo,
      incluirInativas: filtro.incluirInativas === 'true',
    });
  }

  @Post()
  criar(@CurrentUser() user: JwtPayload, @Body() dto: CriarCategoriaDto) {
    return this.categoriasService.criar(user.fazendaId, dto);
  }

  @Patch(':id')
  editar(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EditarCategoriaDto,
  ) {
    return this.categoriasService.editar(user.fazendaId, id, dto);
  }
}
