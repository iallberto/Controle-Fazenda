import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Usuario } from '../usuario/entities/usuario.entity';
import { LoginDto } from './dto/login.dto';

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
}