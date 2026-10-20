import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { VeterinarioService } from './veterinario.service';
import { CreateVeterinarioDto } from './dto/create-veterinario.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/auth.service';

@ApiTags('veterinario')
@ApiBearerAuth()
@Controller('veterinario')
export class VeterinarioController {
  constructor(private readonly veterinarioService: VeterinarioService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateVeterinarioDto) {
    return this.veterinarioService.create(user.fazendaId, user.sub, dto);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload, @Query('incluirInativos') incluirInativos?: string) {
    return this.veterinarioService.findAll(user.fazendaId, incluirInativos === 'true');
  }

  @Patch(':id/inativar')
  inativar(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.veterinarioService.inativar(user.fazendaId, id);
  }
}