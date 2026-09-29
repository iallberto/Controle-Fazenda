import { Controller, Get } from '@nestjs/common';
import { RelatorioService } from './relatorio.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/auth.service';

@Controller('relatorio')
export class RelatorioController {
  constructor(private readonly relatorioService: RelatorioService) {}

  @Get('painel-inicial')
  painelInicial(@CurrentUser() user: JwtPayload) {
    return this.relatorioService.painelInicial(user.fazendaId);
  }
}