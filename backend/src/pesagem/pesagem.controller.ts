import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PesagemService } from './pesagem.service';
import { CreatePesagemDto } from './dto/create-pesagem.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/auth.service';

@ApiTags('pesagem')
@ApiBearerAuth()
@Controller('pesagem')
export class PesagemController {
  constructor(private readonly pesagemService: PesagemService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreatePesagemDto) {
    return this.pesagemService.create(user.fazendaId, user.sub, dto);
  }

  @Get('animal/:animalId')
  findAllPorAnimal(@CurrentUser() user: JwtPayload, @Param('animalId') animalId: string) {
    return this.pesagemService.findAllPorAnimal(user.fazendaId, animalId);
  }
}