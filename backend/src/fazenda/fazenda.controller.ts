import { Controller, Get, Body, Patch } from '@nestjs/common';
import { FazendaService } from './fazenda.service';
import { UpdateFazendaDto } from './dto/update-fazenda.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { PapelUsuario } from '../usuario/entities/usuario.entity';
import type { JwtPayload } from '../auth/auth.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AcessoModulosService } from '../modulos/acesso/acesso-modulos.service';

// A fazenda é sempre a do usuário logado: o id vem do token, nunca da URL,
// para que um usuário não consiga ler ou alterar a fazenda de outro cliente.
// A criação acontece em POST /auth/registrar-fazenda.
@ApiTags('fazenda')
@ApiBearerAuth()
@Controller('fazenda')
export class FazendaController {
  constructor(
    private readonly fazendaService: FazendaService,
    private readonly acessoModulos: AcessoModulosService,
  ) {}

  @Get()
  findOne(@CurrentUser() user: JwtPayload) {
    return this.fazendaService.findOne(user.fazendaId);
  }

  // Situação dos módulos pagos, para o menu, a vitrine e o aviso de
  // vencimento (spec 002, FR-013). Dono e funcionário.
  @Get('modulos')
  modulos(@CurrentUser() user: JwtPayload) {
    return this.acessoModulos.listar(user.fazendaId);
  }

  @Roles(PapelUsuario.DONO)
  @Patch()
  update(@CurrentUser() user: JwtPayload, @Body() updateFazendaDto: UpdateFazendaDto) {
    return this.fazendaService.update(user.fazendaId, updateFazendaDto);
  }
}
