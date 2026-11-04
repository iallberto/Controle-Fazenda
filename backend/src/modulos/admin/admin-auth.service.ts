import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { MoreThan, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Administrador } from './entities/administrador.entity';
import { TentativaLoginAdmin } from './entities/tentativa-login-admin.entity';
import { AUDIENCIA_ADMIN } from './admin-jwt.strategy';

const MAX_FALHAS_SEGUIDAS = 5;
const JANELA_BLOQUEIO_MS = 15 * 60_000;

// Login do administrador do sistema (FR-018, FR-018a, research R7).
// Separado do login das fazendas: outra tabela e token com aud "admin".
@Injectable()
export class AdminAuthService {
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
      accessToken: this.jwtService.sign(
        { sub: administrador.id, papel: 'ADMIN' },
        { audience: AUDIENCIA_ADMIN },
      ),
      administrador: {
        id: administrador.id,
        nome: administrador.nome,
        email: administrador.email,
      },
    };
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
