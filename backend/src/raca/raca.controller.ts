import { Controller, Get, Post, Body, Patch, Param, Query } from '@nestjs/common';
import { RacaService } from './raca.service';
import { CreateRacaDto } from './dto/create-raca.dto';
import { UpdateRacaDto } from './dto/update-raca.dto';

@Controller('raca')
export class RacaController {
  constructor(private readonly racaService: RacaService) {}

  @Post()
  create(@Body() createRacaDto: CreateRacaDto) {
    return this.racaService.create(createRacaDto);
  }

  @Get()
  findAll(@Query('fazendaId') fazendaId?: string) {
    return this.racaService.findAll(fazendaId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.racaService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRacaDto: UpdateRacaDto) {
    return this.racaService.update(id, updateRacaDto);
  }
}