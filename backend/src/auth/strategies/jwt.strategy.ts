import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtPayload } from '../auth.service';
import { tokenAnteriorATroca } from '../token-anterior';
import { Usuario } from '../../usuario/entities/usuario.entity';
import { AUDIENCIA_ADMIN } from '../../modulos/admin/admin-jwt.strategy';

// Resposta para fazenda suspensa pelo administrador (spec 002, FR-026)
export const ACESSO_SUSPENSO = {
  statusCode: 403,
  codigo: 'ACESSO_SUSPENSO',
  message: 'Acesso suspenso · fale com o suporte',
};

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

  // Consulta o usuário e a fazenda a cada requisição: um usuário desativado ou
  // uma fazenda suspensa perdem o acesso na hora, e uma troca de papel vale
  // sem precisar de novo login.
  async validate(
    payload: JwtPayload & { aud?: string | string[]; iat?: number },
  ): Promise<JwtPayload> {
    // Token do administrador nunca abre rotas das fazendas (FR-018)
    const audiencias = ([] as string[]).concat(payload.aud ?? []);
    if (audiencias.includes(AUDIENCIA_ADMIN)) {
      throw new UnauthorizedException('Sessão inválida');
    }
    const usuario = await this.usuarioRepository.findOne({
      where: { id: payload.sub },
      relations: { fazenda: true },
    });
    if (!usuario || !usuario.ativo) {
      throw new UnauthorizedException('Sessão inválida');
    }
    if (tokenAnteriorATroca(payload.iat, usuario.senhaAlteradaEm)) {
      throw new UnauthorizedException('A senha foi trocada · entre de novo');
    }
    if (usuario.fazenda?.suspensa) {
      throw new ForbiddenException(ACESSO_SUSPENSO);
    }
    return {
      sub: usuario.id,
      fazendaId: usuario.fazendaId,
      papel: usuario.papel,
      precisaTrocarSenha: usuario.precisaTrocarSenha,
    };
  }
}
