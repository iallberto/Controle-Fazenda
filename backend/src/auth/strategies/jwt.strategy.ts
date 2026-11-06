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
import {
  DURACAO_SESSAO_SUPORTE_MS,
  SessaoSuporte,
} from '../../modulos/admin/entities/sessao-suporte.entity';
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
    @InjectRepository(SessaoSuporte)
    private readonly sessaoSuporteRepository: Repository<SessaoSuporte>,
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
    if (usuario.suporte) {
      // Acesso de suporte (spec 008): só com a sessão aberta pelo painel, por
      // até 8 horas e com o administrador ativo. Entra mesmo em fazenda suspensa.
      await this.garantirSessaoSuporte(payload.sessaoSuporteId, usuario.id);
      return {
        sub: usuario.id,
        fazendaId: usuario.fazendaId,
        papel: usuario.papel,
        precisaTrocarSenha: false,
        sessaoSuporteId: payload.sessaoSuporteId,
        suporte: true,
      };
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

  private async garantirSessaoSuporte(sessaoId: string | undefined, usuarioId: string) {
    const sessao = sessaoId
      ? await this.sessaoSuporteRepository.findOne({
          where: { id: sessaoId },
          relations: { administrador: true },
        })
      : null;
    const vencida =
      !sessao || Date.now() - new Date(sessao.entradaEm).getTime() > DURACAO_SESSAO_SUPORTE_MS;
    if (
      vencida ||
      sessao.usuarioId !== usuarioId ||
      sessao.saidaEm ||
      !sessao.administrador?.ativo
    ) {
      throw new UnauthorizedException('Sessão de suporte encerrada · entre de novo pelo painel');
    }
  }
}
