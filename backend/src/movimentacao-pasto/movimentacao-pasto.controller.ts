import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { MovimentacaoPastoService } from './movimentacao-pasto.service';
import { MoverAnimalDto } from './dto/mover-animal.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/auth.service';

@Controller('movimentacao-pasto')
export class MovimentacaoPastoController {
  constructor(private readonly movimentacaoPastoService: MovimentacaoPastoService) {}

  @Post()
  mover(@CurrentUser() user: JwtPayload, @Body() dto: MoverAnimalDto) {
    return this.movimentacaoPastoService.mover(user.fazendaId, dto);
  }

  @Get('animal/:animalId')
  historico(@CurrentUser() user: JwtPayload, @Param('animalId') animalId: string) {
    return this.movimentacaoPastoService.historico(user.fazendaId, animalId);
  }
}