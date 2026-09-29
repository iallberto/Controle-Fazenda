import { Controller, Get, Post, Body, Patch, Param } from '@nestjs/common';
import { UsuarioService } from './usuario.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { PapelUsuario } from './entities/usuario.entity';
import type { JwtPayload } from '../auth/auth.service';

@Controller('usuario')
export class UsuarioController {
  constructor(private readonly usuarioService: UsuarioService) {}

  @Roles(PapelUsuario.DONO)
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateUsuarioDto) {
    return this.usuarioService.create(user.fazendaId, dto);
  }

  @Roles(PapelUsuario.DONO)
  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.usuarioService.findAll(user.fazendaId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.usuarioService.findOne(user.fazendaId, id);
  }

  @Roles(PapelUsuario.DONO)
  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateUsuarioDto,
  ) {
    return this.usuarioService.update(user.fazendaId, id, dto);
  }
}