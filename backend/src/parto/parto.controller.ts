import { Controller, Get, Post, Body, Patch, Param, Query } from '@nestjs/common';
import { PartoService } from './parto.service';
import { CreatePartoDto } from './dto/create-parto.dto';
import { UpdatePartoDto } from './dto/update-parto.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/auth.service';

@Controller('parto')
export class PartoController {
  constructor(private readonly partoService: PartoService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreatePartoDto) {
    return this.partoService.create(user.fazendaId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload, @Query('maeId') maeId?: string) {
    return this.partoService.findAll(user.fazendaId, maeId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.partoService.findOne(user.fazendaId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdatePartoDto,
  ) {
    return this.partoService.update(user.fazendaId, id, dto);
  }
}