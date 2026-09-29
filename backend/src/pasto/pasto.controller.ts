import { Controller, Get, Post, Body, Patch, Param } from '@nestjs/common';
import { PastoService } from './pasto.service';
import { CreatePastoDto } from './dto/create-pasto.dto';
import { UpdatePastoDto } from './dto/update-pasto.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/auth.service';

@Controller('pasto')
export class PastoController {
  constructor(private readonly pastoService: PastoService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreatePastoDto) {
    return this.pastoService.create(user.fazendaId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.pastoService.findAll(user.fazendaId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.pastoService.findOne(user.fazendaId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdatePastoDto,
  ) {
    return this.pastoService.update(user.fazendaId, id, dto);
  }
}