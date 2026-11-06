import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { JwtPayload } from '../auth.service';

// Ação que só o dono de verdade faz: o acesso de suporte não mexe em quem
// entra na fazenda nem em senhas (spec 008, FR-005)
export const NAO_SUPORTE = 'naoSuporte';
export const NaoPermitidoAoSuporte = () => SetMetadata(NAO_SUPORTE, true);

@Injectable()
export class SuporteGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const marcado = this.reflector.getAllAndOverride<boolean>(NAO_SUPORTE, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!marcado) return true;
    const usuario = context.switchToHttp().getRequest<{ user?: JwtPayload }>().user;
    if (usuario?.suporte) {
      throw new ForbiddenException({
        statusCode: 403,
        codigo: 'ACAO_SO_DO_DONO',
        message: 'No acesso de suporte não dá para mexer em usuários e senhas',
      });
    }
    return true;
  }
}
