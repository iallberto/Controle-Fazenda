import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PERMITE_SENHA_PROVISORIA } from '../decorators/permite-senha-provisoria.decorator';
import { IS_AREA_ADMIN } from '../../modulos/admin/area-admin.decorator';
import type { JwtPayload } from '../auth.service';

export const SENHA_PROVISORIA = {
  statusCode: 403,
  codigo: 'SENHA_PROVISORIA',
  message: 'Crie uma senha nova para continuar',
};

// Com a senha provisória (redefinida pelo dono ou pelo administrador), o usuário
// só pode trocar a senha. Fica no servidor para valer mesmo sem a tela (spec 007,
// FR-004). Roda depois do guard de JWT, que preenche request.user.
@Injectable()
export class SenhaProvisoriaGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const alvos = [context.getHandler(), context.getClass()];
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, alvos) ||
      this.reflector.getAllAndOverride<boolean>(IS_AREA_ADMIN, alvos) ||
      this.reflector.getAllAndOverride<boolean>(PERMITE_SENHA_PROVISORIA, alvos)
    ) {
      return true;
    }
    const usuario = context.switchToHttp().getRequest<{ user?: JwtPayload }>().user;
    if (usuario?.precisaTrocarSenha) {
      throw new ForbiddenException(SENHA_PROVISORIA);
    }
    return true;
  }
}
