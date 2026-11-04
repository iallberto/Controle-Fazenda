import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../../auth/auth.service';
import { Modulo } from '../acesso/modulo.decorator';
import { ModuloPago } from '../acesso/modulo-pago';
import { LactacoesService } from './lactacoes.service';
import { IniciarLactacaoDto } from './dto/leite.dto';

// Início manual da lactação (spec 004, FR-006); dono e funcionário
@ApiTags('leite')
@ApiBearerAuth()
@Modulo(ModuloPago.LEITE)
@Controller('modulos/leite/lactacoes')
export class LactacoesController {
  constructor(private readonly lactacoesService: LactacoesService) {}

  @Post()
  iniciar(@CurrentUser() user: JwtPayload, @Body() dto: IniciarLactacaoDto) {
    return this.lactacoesService.iniciar(user.fazendaId, user.sub, dto);
  }
}
