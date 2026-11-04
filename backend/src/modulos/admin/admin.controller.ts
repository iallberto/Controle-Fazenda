import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from '../../auth/decorators/public.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AdminAuthService } from './admin-auth.service';
import { AdminFazendasService } from './admin-fazendas.service';
import { AreaAdmin } from './area-admin.decorator';
import type { AdminPayload } from './admin-jwt.strategy';
import {
  AdminLoginDto,
  FiltroFazendasDto,
  LiberarModuloDto,
  SuspenderFazendaDto,
} from './dto/admin.dto';

// Login do administrador: rota pública, separada do login das fazendas
@ApiTags('admin')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.CREATED)
  login(@Body() dto: AdminLoginDto, @Ip() ip: string) {
    return this.adminAuthService.login(dto, ip);
  }
}

// Painel do dono do software (FR-019 a FR-027). Só aceita token de administrador.
@ApiTags('admin')
@ApiBearerAuth()
@AreaAdmin()
@Controller('admin')
export class AdminController {
  constructor(private readonly adminFazendasService: AdminFazendasService) {}

  @Get('fazendas')
  listar(@Query() filtro: FiltroFazendasDto) {
    return this.adminFazendasService.listar(filtro.busca);
  }

  @Get('fazendas/:id')
  detalhar(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminFazendasService.detalhar(id);
  }

  @Post('fazendas/:id/modulos')
  liberar(
    @CurrentUser() admin: AdminPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LiberarModuloDto,
  ) {
    return this.adminFazendasService.liberar(admin.sub, id, dto);
  }

  @Post('modulos/:periodoId/desativar')
  desativar(
    @CurrentUser() admin: AdminPayload,
    @Param('periodoId', ParseUUIDPipe) periodoId: string,
  ) {
    return this.adminFazendasService.desativar(admin.sub, periodoId);
  }

  @Post('fazendas/:id/suspender')
  suspender(
    @CurrentUser() admin: AdminPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SuspenderFazendaDto,
  ) {
    return this.adminFazendasService.suspender(admin.sub, id, dto.motivo);
  }

  @Post('fazendas/:id/reativar')
  reativar(
    @CurrentUser() admin: AdminPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.adminFazendasService.reativar(admin.sub, id);
  }
}
