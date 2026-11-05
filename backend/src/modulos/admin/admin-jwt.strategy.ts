import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { Administrador } from './entities/administrador.entity';
import { tokenAnteriorATroca } from '../../auth/token-anterior';

// Tokens do administrador levam aud "admin"; os das fazendas não. Esta
// estratégia só aceita o primeiro, e a das fazendas recusa o segundo (R6).
export const AUDIENCIA_ADMIN = 'admin';

export interface AdminPayload {
  sub: string;
  papel: 'ADMIN';
}

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'jwt-admin') {
  constructor(
    config: ConfigService,
    @InjectRepository(Administrador)
    private readonly administradorRepository: Repository<Administrador>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
      audience: AUDIENCIA_ADMIN,
    });
  }

  // Consulta a cada requisição: um administrador desativado perde o acesso na hora
  async validate(payload: AdminPayload & { iat?: number }): Promise<AdminPayload> {
    const administrador = await this.administradorRepository.findOneBy({
      id: payload.sub,
    });
    if (!administrador || !administrador.ativo) {
      throw new UnauthorizedException('Sessão inválida');
    }
    if (tokenAnteriorATroca(payload.iat, administrador.senhaAlteradaEm)) {
      throw new UnauthorizedException('A senha foi trocada · entre de novo');
    }
    return { sub: administrador.id, papel: 'ADMIN' };
  }
}
