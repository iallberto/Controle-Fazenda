import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { MoreThan, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Administrador } from './entities/administrador.entity';
import { TentativaLoginAdmin } from './entities/tentativa-login-admin.entity';
import { AUDIENCIA_ADMIN } from './admin-jwt.strategy';
import { motivoSenhaFraca } from './senha-admin';

const MAX_FALHAS_SEGUIDAS = 5;
const JANELA_BLOQUEIO_MS = 15 * 60_000;

// Login do administrador do sistema (FR-018, FR-018a, research R7).
// Separado do login das fazendas: outra tabela e token com aud "admin".
@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name);

  constructor(
    @InjectRepository(Administrador)
    private readonly administradorRepository: Repository<Administrador>,
    @InjectRepository(TentativaLoginAdmin)
    private readonly tentativaRepository: Repository<TentativaLoginAdmin>,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: { email: string; senha: string }, ip?: string) {
    const email = dto.email.trim().toLowerCase();
    await this.garantirNaoBloqueado(email, ip);

    const administrador = await this.administradorRepository.findOneBy({
      email,
    });
    const senhaConfere = administrador
      ? await bcrypt.compare(dto.senha, administrador.senhaHash)
      : false;
    if (!administrador || !senhaConfere || !administrador.ativo) {
      await this.registrar(email, false, ip);
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    await this.registrar(email, true, ip);
    return {
      accessToken: this.token(administrador.id),
      administrador: {
        id: administrador.id,
        nome: administrador.nome,
        email: administrador.email,
      },
    };
  }

  // Troca da própria senha no painel (spec 007, FR-002, FR-005): mesma regra do
  // comando criar-admin; devolve token novo e os anteriores deixam de valer
  async trocarSenha(administradorId: string, dto: { senhaAtual: string; novaSenha: string }) {
    const administrador = await this.administradorRepository.findOneBy({ id: administradorId });
    if (!administrador || !administrador.ativo) {
      throw new UnauthorizedException('Sessão inválida');
    }
    if (!(await bcrypt.compare(dto.senhaAtual, administrador.senhaHash))) {
      throw new BadRequestException('A senha atual não confere');
    }
    const fraca = motivoSenhaFraca(dto.novaSenha);
    if (fraca) throw new BadRequestException(fraca);
    if (dto.novaSenha === dto.senhaAtual) {
      throw new BadRequestException('A senha nova precisa ser diferente da atual');
    }
    await this.administradorRepository.update(
      { id: administrador.id },
      { senhaHash: await bcrypt.hash(dto.novaSenha, 10), senhaAlteradaEm: new Date() },
    );
    return { accessToken: this.token(administrador.id) };
  }

  private token(administradorId: string) {
    return this.jwtService.sign({ sub: administradorId, papel: 'ADMIN' }, { audience: AUDIENCIA_ADMIN });
  }

  // Bloqueia quando as últimas 5 tentativas, dentro de 15 minutos, falharam
  // todas. Vale mesmo com a senha certa. A tentativa bloqueada também fica
  // registrada, como falha.
  private async garantirNaoBloqueado(email: string, ip?: string) {
    const agora = Date.now();
    const recentes = await this.tentativaRepository.find({
      where: {
        email,
        criadoEm: MoreThan(new Date(agora - JANELA_BLOQUEIO_MS)),
      },
      order: { criadoEm: 'DESC' },
      take: MAX_FALHAS_SEGUIDAS,
    });
    if (
      recentes.length < MAX_FALHAS_SEGUIDAS ||
      recentes.some((t) => t.sucesso)
    ) {
      return;
    }
    const maisAntiga = Math.min(
      ...recentes.map((t) => new Date(t.criadoEm).getTime()),
    );
    const minutos = Math.max(
      1,
      Math.ceil((maisAntiga + JANELA_BLOQUEIO_MS - agora) / 60_000),
    );
    await this.registrar(email, false, ip);
    // Registro do bloqueio, sem a senha (spec 007, FR-009)
    this.logger.warn(`Login do painel bloqueado por tentativas: ${email} (${ip ?? 'sem endereço'})`);
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        codigo: 'LOGIN_BLOQUEADO',
        message: `Muitas tentativas. Tente de novo em ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private registrar(email: string, sucesso: boolean, ip?: string) {
    return this.tentativaRepository.insert({ email, sucesso, ip: ip ?? null });
  }
}
