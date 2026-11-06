import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { IS_AREA_ADMIN } from '../../modulos/admin/area-admin.decorator';
import { AcessoFazendaService } from '../../fazenda/acesso-fazenda.service';
import type { JwtPayload } from '../auth.service';

// Rota liberada mesmo com a fazenda só para consulta (ex.: trocar a senha)
export const PERMITE_SEM_ACESSO = 'permiteSemAcesso';
export const PermiteSemAcesso = () => SetMetadata(PERMITE_SEM_ACESSO, true);

// Fazenda aguardando implantação ou vencida (depois da carência) só consulta
// (spec 008, FR-009a e FR-013). GET passa; o suporte passa sempre, porque é ele
// quem faz a implantação.
@Injectable()
export class AcessoFazendaGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly acesso: AcessoFazendaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const alvos = [context.getHandler(), context.getClass()];
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, alvos) ||
      this.reflector.getAllAndOverride<boolean>(IS_AREA_ADMIN, alvos) ||
      this.reflector.getAllAndOverride<boolean>(PERMITE_SEM_ACESSO, alvos)
    ) {
      return true;
    }
    const request = context.switchToHttp().getRequest<{ method: string; user?: JwtPayload }>();
    if (request.method === 'GET' || !request.user?.fazendaId || request.user.suporte) {
      return true;
    }
    const situacao = await this.acesso.situacao(request.user.fazendaId);
    if (situacao.podeLancar) return true;
    throw new ForbiddenException({
      statusCode: 403,
      codigo: 'FAZENDA_SO_CONSULTA',
      situacao: situacao.situacao,
      message:
        situacao.situacao === 'AGUARDANDO_IMPLANTACAO'
          ? 'Fazenda aguardando implantação: por enquanto, só consulta'
          : 'O prazo de acesso venceu: a fazenda está só para consulta até a renovação',
    });
  }
}
