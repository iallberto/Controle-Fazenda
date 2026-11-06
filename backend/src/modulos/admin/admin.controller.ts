import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from '../../auth/decorators/public.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AdminAuthService } from './admin-auth.service';
import { AdminFazendasService } from './admin-fazendas.service';
import { SuporteService } from './suporte.service';
import { PrazoFazendasService } from './prazo-fazendas.service';
import { AreaAdmin } from './area-admin.decorator';
import type { AdminPayload } from './admin-jwt.strategy';
import {
  AdminLoginDto,
  AdminTrocarSenhaDto,
  AlterarFazendaDto,
  ConfirmarPagamentoDto,
  CriarFazendaDto,
  EstenderPrazoDto,
  LiberarTesteDto,
  PrecosPlanoDto,
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

  // Troca da própria senha do administrador (spec 007, FR-002)
  @AreaAdmin()
  @ApiBearerAuth()
  @Post('trocar-senha')
  @HttpCode(HttpStatus.OK)
  trocarSenha(@CurrentUser() admin: AdminPayload, @Body() dto: AdminTrocarSenhaDto) {
    return this.adminAuthService.trocarSenha(admin.sub, dto);
  }
}

// Painel do dono do software (FR-019 a FR-027). Só aceita token de administrador.
@ApiTags('admin')
@ApiBearerAuth()
@AreaAdmin()
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminFazendasService: AdminFazendasService,
    private readonly suporteService: SuporteService,
    private readonly prazoService: PrazoFazendasService,
  ) {}

  // Prazo de acesso (spec 008, US3)
  @Post('fazendas/:id/teste')
  liberarTeste(@CurrentUser() admin: AdminPayload, @Param('id', ParseUUIDPipe) id: string, @Body() dto: LiberarTesteDto) {
    return this.prazoService.liberarTeste(admin.sub, id, dto.modulos);
  }

  @Post('fazendas/:id/pagamento')
  confirmarPagamento(
    @CurrentUser() admin: AdminPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConfirmarPagamentoDto,
  ) {
    return this.prazoService.confirmarPagamento(admin.sub, id, dto.valorCentavos);
  }

  @Post('fazendas/:id/prazo')
  estenderPrazo(@CurrentUser() admin: AdminPayload, @Param('id', ParseUUIDPipe) id: string, @Body() dto: EstenderPrazoDto) {
    return this.prazoService.estenderPrazo(admin.sub, id, dto.acessoAte);
  }

  @Post('fazendas/:id/sem-prazo')
  tornarSemPrazo(@CurrentUser() admin: AdminPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.prazoService.tornarSemPrazo(admin.sub, id);
  }

  @Patch('fazendas/:id')
  alterarFazenda(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AlterarFazendaDto) {
    return this.prazoService.alterarTelefone(id, dto.telefoneContato ?? null);
  }

  @Get('vencimentos')
  vencimentos() {
    return this.prazoService.vencimentos();
  }

  @Get('precos')
  precos() {
    return this.prazoService.precos();
  }

  @Put('precos')
  salvarPrecos(@Body() dto: PrecosPlanoDto) {
    return this.prazoService.salvarPrecos(dto);
  }

  // Entrar na fazenda do cliente como suporte (spec 008, US1)
  @Post('fazendas/:id/suporte')
  entrarComoSuporte(@CurrentUser() admin: AdminPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.suporteService.entrar(admin.sub, id);
  }

  // Fazenda nova com o dono, só pelo administrador (spec 007, FR-023)
  @Post('fazendas')
  criarFazenda(@Body() dto: CriarFazendaDto) {
    return this.adminFazendasService.criarFazenda(dto);
  }

  // Senha provisória para o dono que esqueceu a senha (spec 007, FR-003)
  @Post('fazendas/:id/redefinir-senha-dono')
  redefinirSenhaDono(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminFazendasService.redefinirSenhaDono(id);
  }

  @Get('fazendas')
  listar(@Query() filtro: FiltroFazendasDto) {
    return this.adminFazendasService.listar(filtro.busca);
  }

  @Get('fazendas/:id')
  async detalhar(@Param('id', ParseUUIDPipe) id: string) {
    const [fazenda, sessoesSuporte, prazo] = await Promise.all([
      this.adminFazendasService.detalhar(id),
      this.suporteService.sessoesDaFazenda(id),
      this.prazoService.prazoDaFazenda(id),
    ]);
    return { ...fazenda, sessoesSuporte, prazo };
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
