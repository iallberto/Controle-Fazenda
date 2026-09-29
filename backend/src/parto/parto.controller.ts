import { Controller, Get, Post, Body, Patch, Param, Query } from '@nestjs/common';
import { PartoService } from './parto.service';
import { CreatePartoDto } from './dto/create-parto.dto';
import { UpdatePartoDto } from './dto/update-parto.dto';

@Controller('parto')
export class PartoController {
  constructor(private readonly partoService: PartoService) {}

  @Post()
  create(@Body() createPartoDto: CreatePartoDto) {
    return this.partoService.create(createPartoDto);
  }

  @Get()
  findAll(@Query('maeId') maeId?: string) {
    return this.partoService.findAll(maeId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.partoService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePartoDto: UpdatePartoDto) {
    return this.partoService.update(id, updatePartoDto);
  }
}