import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { PartoService } from './parto.service';
import { CreatePartoDto } from './dto/create-parto.dto';
import { UpdatePartoDto } from './dto/update-parto.dto';
import { DefinirPaiDto } from './dto/definir-pai.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { PapelUsuario } from '../usuario/entities/usuario.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/auth.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('parto')
@ApiBearerAuth()
@Controller('parto')
export class PartoController {
  constructor(private readonly partoService: PartoService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreatePartoDto) {
    return this.partoService.create(user.fazendaId, user.sub, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('maeId', new ParseUUIDPipe({ optional: true })) maeId?: string,
  ) {
    return this.partoService.findAll(user.fazendaId, maeId);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.partoService.findOne(user.fazendaId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePartoDto,
  ) {
    return this.partoService.update(user.fazendaId, user.sub, id, dto);
  }

  // Só o dono: define o pai entre os candidatos do parto (FR-021)
  @Roles(PapelUsuario.DONO)
  @Patch(':id/pai')
  definirPai(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DefinirPaiDto,
  ) {
    return this.partoService.definirPai(user.fazendaId, user.sub, id, dto);
  }
}
