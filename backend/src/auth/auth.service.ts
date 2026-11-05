import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Usuario } from '../usuario/entities/usuario.entity';
import { LoginDto } from './dto/login.dto';
import { ACESSO_SUSPENSO } from './strategies/jwt.strategy';
import { TrocarSenhaDto } from './dto/trocar-senha.dto';

export interface JwtPayload {
  sub: string;
  fazendaId: string;
  papel: string;
  // Só no usuário validado da requisição (spec 007, FR-004)
  precisaTrocarSenha?: boolean;
}


const MAX_TENTATIVAS_LOGIN = 5;
const JANELA_BLOQUEIO_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  // Falhas de login por e-mail, em memória. Basta para uma instância só;
  // com várias instâncias, o controle precisaria ir para um armazenamento comum.
  private readonly falhasLogin = new Map<string, { quantidade: number; desde: number }>();

  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    this.garantirLoginNaoBloqueado(dto.email);

    const usuario = await this.usuarioRepository.findOne({
      where: { email: dto.email },
      relations: { fazenda: true },
    });
    const senhaConfere = usuario ? await bcrypt.compare(dto.senha, usuario.senhaHash) : false;
    if (!usuario || !senhaConfere) {
      this.registrarFalhaLogin(dto.email);
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }
    if (!usuario.ativo) {
      throw new UnauthorizedException('Este usuário está desativado');
    }
    // Fazenda suspensa pelo administrador: ninguém dela entra (spec 002, FR-026)
    if (usuario.fazenda?.suspensa) {
      throw new ForbiddenException(ACESSO_SUSPENSO);
    }
    this.falhasLogin.delete(dto.email);
    return this.sessao(usuario);
  }

  // Troca da própria senha (spec 007, FR-001, FR-002, FR-005). Desliga a senha
  // provisória e devolve um token novo: os anteriores deixam de valer.
  async trocarSenha(usuarioId: string, dto: TrocarSenhaDto) {
    const usuario = await this.usuarioRepository.findOneBy({ id: usuarioId });
    if (!usuario || !usuario.ativo) {
      throw new UnauthorizedException('Sessão inválida');
    }
    if (!(await bcrypt.compare(dto.senhaAtual, usuario.senhaHash))) {
      throw new BadRequestException('A senha atual não confere');
    }
    if (dto.novaSenha === dto.senhaAtual) {
      throw new BadRequestException('A senha nova precisa ser diferente da atual');
    }
    usuario.senhaHash = await bcrypt.hash(dto.novaSenha, 10);
    usuario.senhaAlteradaEm = new Date();
    usuario.precisaTrocarSenha = false;
    await this.usuarioRepository.save(usuario);
    return this.sessao(usuario);
  }

  private sessao(usuario: Usuario) {
    const payload: JwtPayload = {
      sub: usuario.id,
      fazendaId: usuario.fazendaId,
      papel: usuario.papel,
    };
    return {
      accessToken: this.jwtService.sign(payload),
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        papel: usuario.papel,
        fazendaId: usuario.fazendaId,
        precisaTrocarSenha: usuario.precisaTrocarSenha ?? false,
      },
    };
  }

  private garantirLoginNaoBloqueado(email: string) {
    const falhas = this.falhasLogin.get(email);
    if (!falhas) {
      return;
    }
    if (Date.now() - falhas.desde > JANELA_BLOQUEIO_MS) {
      this.falhasLogin.delete(email);
      return;
    }
    if (falhas.quantidade >= MAX_TENTATIVAS_LOGIN) {
      // Registro do bloqueio, sem a senha (spec 007, FR-009)
      this.logger.warn(`Login bloqueado por tentativas: ${email}`);
      throw new HttpException(
        'Muitas tentativas de login. Tente novamente em alguns minutos.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private registrarFalhaLogin(email: string) {
    const falhas = this.falhasLogin.get(email);
    if (!falhas || Date.now() - falhas.desde > JANELA_BLOQUEIO_MS) {
      this.falhasLogin.set(email, { quantidade: 1, desde: Date.now() });
    } else {
      falhas.quantidade++;
    }
  }
}
