import { Controller, Get, Post, Body, Patch, Param, Query } from '@nestjs/common';
import { TratamentoService } from './tratamento.service';
import { CreateTratamentoDto } from './dto/create-tratamento.dto';
import { UpdateTratamentoDto } from './dto/update-tratamento.dto';

@Controller('tratamento')
export class TratamentoController {
  constructor(private readonly tratamentoService: TratamentoService) {}

  @Post()
  create(@Body() createTratamentoDto: CreateTratamentoDto) {
    return this.tratamentoService.create(createTratamentoDto);
  }

  @Get()
  findAll(@Query('animalId') animalId?: string) {
    return this.tratamentoService.findAll(animalId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tratamentoService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTratamentoDto: UpdateTratamentoDto) {
    return this.tratamentoService.update(id, updateTratamentoDto);
  }
}