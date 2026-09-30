import { Controller, Get, Post, Body, Patch, Param, Query } from '@nestjs/common';
import { AnimalService } from './animal.service';
import { CreateAnimalDto } from './dto/create-animal.dto';
import { UpdateAnimalDto } from './dto/update-animal.dto';
import { AlterarStatusAnimalDto } from './dto/alterar-status-animal.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/auth.service';
import { CategoriaAnimal } from './entities/animal.entity';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';


@Controller('animal')
@ApiTags('animal')
@ApiBearerAuth()
export class AnimalController {
  constructor(private readonly animalService: AnimalService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateAnimalDto) {
    return this.animalService.create(user.fazendaId, dto);
  }

 @Get()
  findAll(@CurrentUser() user: JwtPayload, @Query('categoria') categoria?: CategoriaAnimal) {
    return this.animalService.findAll(user.fazendaId, categoria);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.animalService.findOne(user.fazendaId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateAnimalDto,
  ) {
    return this.animalService.update(user.fazendaId, id, dto);
  }

  @Patch(':id/status')
  alterarStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AlterarStatusAnimalDto,
  ) {
    return this.animalService.alterarStatus(user.fazendaId, id, dto.status, dto.motivo, dto.data);
  }
}