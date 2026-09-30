import { Controller, Get, Post, Body, Patch, Param, Query } from '@nestjs/common';
import { TratamentoService } from './tratamento.service';
import { CreateTratamentoDto } from './dto/create-tratamento.dto';
import { UpdateTratamentoDto } from './dto/update-tratamento.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/auth.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('tratamento')
@ApiBearerAuth()
@Controller('tratamento')
export class TratamentoController {
  constructor(private readonly tratamentoService: TratamentoService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateTratamentoDto) {
    return this.tratamentoService.create(user.fazendaId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload, @Query('animalId') animalId?: string) {
    return this.tratamentoService.findAll(user.fazendaId, animalId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.tratamentoService.findOne(user.fazendaId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateTratamentoDto,
  ) {
    return this.tratamentoService.update(user.fazendaId, id, dto);
  }
}