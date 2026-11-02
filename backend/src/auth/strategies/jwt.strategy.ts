import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtPayload } from '../auth.service';
import { Usuario } from '../../usuario/entities/usuario.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  // Consulta o usuário a cada requisição: um usuário desativado perde o acesso
  // na hora, e uma troca de papel vale sem precisar de novo login.
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const usuario = await this.usuarioRepository.findOneBy({ id: payload.sub });
    if (!usuario || !usuario.ativo) {
      throw new UnauthorizedException('Sessão inválida');
    }
    return { sub: usuario.id, fazendaId: usuario.fazendaId, papel: usuario.papel };
  }
}
