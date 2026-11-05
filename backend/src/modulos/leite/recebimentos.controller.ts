import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import type { JwtPayload } from '../../auth/auth.service';
import { PapelUsuario } from '../../usuario/entities/usuario.entity';
import { Modulo } from '../acesso/modulo.decorator';
import { ModuloPago } from '../acesso/modulo-pago';
import { RecebimentosService } from './recebimentos.service';
import { MotivoLeiteDto } from './dto/leite.dto';

const MES = /^\d{4}-(0[1-9]|1[0-2])$/;

class FiltroRecebimentoDto {
  @Matches(MES, { message: 'Mês no formato AAAA-MM' })
  mes: string;
}

class ConfirmarRecebimentoDto {
  @Matches(MES, { message: 'Mês no formato AAAA-MM' })
  mes: string;

  @IsDateString({ strict: true })
  data: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2_000_000_000)
  valorRecebidoCentavos?: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(200)
  observacao?: string;
}

// Recebimento do leite do mês (spec 006, US1). Só o dono (dinheiro).
@ApiTags('leite')
@ApiBearerAuth()
@Modulo(ModuloPago.LEITE)
@Roles(PapelUsuario.DONO)
@Controller('modulos/leite/recebimentos')
export class RecebimentosController {
  constructor(private readonly recebimentosService: RecebimentosService) {}

  @Get()
  doMes(@CurrentUser() user: JwtPayload, @Query() filtro: FiltroRecebimentoDto) {
    return this.recebimentosService.doMes(user.fazendaId, filtro.mes);
  }

  @Post()
  confirmar(@CurrentUser() user: JwtPayload, @Body() dto: ConfirmarRecebimentoDto) {
    return this.recebimentosService.confirmar(user.fazendaId, user.sub, dto);
  }

  @Post(':id/desfazer')
  desfazer(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MotivoLeiteDto,
  ) {
    return this.recebimentosService.desfazer(user.fazendaId, user.sub, id, dto.motivo);
  }
}
