import { Controller, Get, Post, Body, Patch, Param, Query } from '@nestjs/common';
import { AnimalService } from './animal.service';
import { CreateAnimalDto } from './dto/create-animal.dto';
import { UpdateAnimalDto } from './dto/update-animal.dto';
import { AlterarStatusAnimalDto } from './dto/alterar-status-animal.dto';

@Controller('animal')
export class AnimalController {
  constructor(private readonly animalService: AnimalService) {}

  @Post()
  create(@Body() createAnimalDto: CreateAnimalDto) {
    return this.animalService.create(createAnimalDto);
  }

  @Get()
  findAll(@Query('fazendaId') fazendaId?: string) {
    return this.animalService.findAll(fazendaId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.animalService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAnimalDto: UpdateAnimalDto) {
    return this.animalService.update(id, updateAnimalDto);
  }

  @Patch(':id/status')
  alterarStatus(@Param('id') id: string, @Body() dto: AlterarStatusAnimalDto) {
    return this.animalService.alterarStatus(id, dto.status, dto.motivo, dto.data);
  }
}