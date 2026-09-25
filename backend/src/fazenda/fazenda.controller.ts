import { Controller, Get, Post, Body, Patch, Param } from '@nestjs/common';
import { FazendaService } from './fazenda.service';
import { CreateFazendaDto } from './dto/create-fazenda.dto';
import { UpdateFazendaDto } from './dto/update-fazenda.dto';

@Controller('fazenda')
export class FazendaController {
  constructor(private readonly fazendaService: FazendaService) {}

  @Post()
  create(@Body() createFazendaDto: CreateFazendaDto) {
    return this.fazendaService.create(createFazendaDto);
  }

  @Get()
  findAll() {
    return this.fazendaService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.fazendaService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateFazendaDto: UpdateFazendaDto) {
    return this.fazendaService.update(id, updateFazendaDto);
  }
}