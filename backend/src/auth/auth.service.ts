import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Usuario, PapelUsuario } from '../usuario/entities/usuario.entity';
import { Fazenda } from '../fazenda/entities/fazenda.entity';
import { LoginDto } from './dto/login.dto';
import { RegistrarFazendaDto } from './dto/registrar-fazenda.dto';

export interface JwtPayload {
  sub: string;
  fazendaId: string;
  papel: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
  ) {}

  async login(dto: LoginDto) {
    const usuario = await this.usuarioRepository.findOneBy({ email: dto.email });
    if (!usuario) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    const senhaConfere = await bcrypt.compare(dto.senha, usuario.senhaHash);
    if (!senhaConfere) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

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
