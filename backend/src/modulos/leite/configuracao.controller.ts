import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import type { JwtPayload } from '../../auth/auth.service';
import { PapelUsuario } from '../../usuario/entities/usuario.entity';
import { Modulo } from '../acesso/modulo.decorator';
import { ModuloPago } from '../acesso/modulo-pago';
import { ConfiguracaoLeiteService } from './configuracao.service';
import { EditarConfiguracaoLeiteDto } from './dto/leite.dto';

// Configurações do Leite: todos leem; só o dono altera (spec 004, FR-002)
@ApiTags('leite')
@ApiBearerAuth()
@Modulo(ModuloPago.LEITE)
@Controller('modulos/leite/configuracao')
export class ConfiguracaoLeiteController {
  constructor(private readonly configuracaoService: ConfiguracaoLeiteService) {}

  @Get()
  obter(@CurrentUser() user: JwtPayload) {
    return this.configuracaoService.obter(user.fazendaId, user.sub);
  }

  @Roles(PapelUsuario.DONO)
  @Patch()
  editar(
    @CurrentUser() user: JwtPayload,
    @Body() dto: EditarConfiguracaoLeiteDto,
  ) {
    return this.configuracaoService.editar(user.fazendaId, user.sub, dto);
  }
}
