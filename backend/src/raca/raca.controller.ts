import { Controller, Get, Post, Body, Patch, Param } from '@nestjs/common';
import { RacaService } from './raca.service';
import { CreateRacaDto } from './dto/create-raca.dto';
import { UpdateRacaDto } from './dto/update-raca.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/auth.service';

@Controller('raca')
export class RacaController {
  constructor(private readonly racaService: RacaService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateRacaDto) {
    return this.racaService.create(user.fazendaId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.racaService.findAll(user.fazendaId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.racaService.findOne(user.fazendaId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateRacaDto,
  ) {
    return this.racaService.update(user.fazendaId, id, dto);
  }
}