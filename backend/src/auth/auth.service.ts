import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Usuario, PapelUsuario } from '../usuario/entities/usuario.entity';
import { Fazenda } from '../fazenda/entities/fazenda.entity';
import { LoginDto } from './dto/login.dto';
import { RegistrarFazendaDto } from './dto/registrar-fazenda.dto';
import { ACESSO_SUSPENSO } from './strategies/jwt.strategy';

export interface JwtPayload {
  sub: string;
  fazendaId: string;
  papel: string;
}

const MAX_TENTATIVAS_LOGIN = 5;
const JANELA_BLOQUEIO_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService {
  // Falhas de login por e-mail, em memória. Basta para uma instância só;
  // com várias instâncias, o controle precisaria ir para um armazenamento comum.
  private readonly falhasLogin = new Map<string, { quantidade: number; desde: number }>();

  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
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

  async registrarFazenda(dto: RegistrarFazendaDto) {
    const emailExistente = await this.usuarioRepository.findOneBy({ email: dto.email });
    if (emailExistente) {
      throw new ConflictException('Já existe um usuário com este e-mail');
    }

    const senhaHash = await bcrypt.hash(dto.senha, 10);

    const { fazenda, usuario } = await this.dataSource.transaction(async (manager) => {
      const fazenda = await manager.save(
        manager.create(Fazenda, { nome: dto.nomeFazenda }),
      );
      const usuario = await manager.save(
        manager.create(Usuario, {
          fazendaId: fazenda.id,
          nome: dto.nome,
          email: dto.email,
          senhaHash,
          papel: PapelUsuario.DONO,
          criadoPorId: null,
        }),
      );
      return { fazenda, usuario };
    });

    const payload: JwtPayload = {
      sub: usuario.id,
      fazendaId: fazenda.id,
      papel: usuario.papel,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        papel: usuario.papel,
        fazendaId: fazenda.id,
      },
    };
  }
}
