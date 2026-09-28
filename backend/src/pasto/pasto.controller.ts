import { Controller, Get, Post, Body, Patch, Param } from '@nestjs/common';
import { PastoService } from './pasto.service';
import { CreatePastoDto } from './dto/create-pasto.dto';
import { UpdatePastoDto } from './dto/update-pasto.dto';

@Controller('pasto')
export class PastoController {
  constructor(private readonly pastoService: PastoService) {}

  @Post()
  create(@Body() createPastoDto: CreatePastoDto) {
    return this.pastoService.create(createPastoDto);
  }

  @Get()
  findAll() {
    return this.pastoService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pastoService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePastoDto: UpdatePastoDto) {
    return this.pastoService.update(id, updatePastoDto);
  }
}