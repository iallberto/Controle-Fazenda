import { Controller, Get, Post, Body, Patch, Param, ParseUUIDPipe } from '@nestjs/common';
import { UsuarioService } from './usuario.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { PapelUsuario } from './entities/usuario.entity';
import type { JwtPayload } from '../auth/auth.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@Controller('usuario')
@ApiTags('usuario')
@ApiBearerAuth()
export class UsuarioController {
  constructor(private readonly usuarioService: UsuarioService) {}

  @Roles(PapelUsuario.DONO)
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateUsuarioDto) {
    return this.usuarioService.create(user.fazendaId, user.sub, dto);
  }

  @Roles(PapelUsuario.DONO)
  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.usuarioService.findAll(user.fazendaId);
  }

  // Antes de ':id' para não ser capturada como um id
  @Get('aplicadores')
  listarAplicadores(@CurrentUser() user: JwtPayload) {
    return this.usuarioService.listarAplicadores(user.fazendaId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.usuarioService.findOne(user.fazendaId, id);
  }

  @Roles(PapelUsuario.DONO)
  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUsuarioDto,
  ) {
    return this.usuarioService.update(user.fazendaId, user.sub, id, dto);
  }

  @Roles(PapelUsuario.DONO)
  @Patch(':id/desativar')
  desativar(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.usuarioService.alterarAtivo(user.fazendaId, user.sub, id, false);
  }

  // Senha provisória para o funcionário que esqueceu a senha (spec 007, FR-003)
  @Roles(PapelUsuario.DONO)
  @Post(':id/redefinir-senha')
  redefinirSenha(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.usuarioService.redefinirSenha(user.fazendaId, user.sub, id);
  }

  @Roles(PapelUsuario.DONO)
  @Patch(':id/reativar')
  reativar(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.usuarioService.alterarAtivo(user.fazendaId, user.sub, id, true);
  }
}