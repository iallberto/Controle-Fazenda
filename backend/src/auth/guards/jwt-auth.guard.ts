import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { IS_AREA_ADMIN } from '../../modulos/admin/area-admin.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    // Painel do administrador: quem confere o token é o AdminJwtGuard, que vem
    // junto do @AreaAdmin() no próprio controller (spec 002, R6)
    const isAreaAdmin = this.reflector.getAllAndOverride<boolean>(
      IS_AREA_ADMIN,
      [context.getHandler(), context.getClass()],
    );
    if (isAreaAdmin) {
      return true;
    }
    return super.canActivate(context);
  }
}
