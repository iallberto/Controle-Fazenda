import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { JwtPayload } from '../../auth/auth.service';
import { AcessoModulosService } from './acesso-modulos.service';
import {
  MODULO_KEY,
  type MarcaModulo,
  type TipoAcao,
} from './modulo.decorator';

// Bloqueio dos módulos pagos no backend (FR-010, FR-011a, research R4).
// Global: roda em toda rota, mas só age nas marcadas com @Modulo. Esconder o
// botão na tela não basta (constituição, princípio II).
@Injectable()
export class ModuloGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly acesso: AcessoModulosService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const doMetodo = this.reflector.get<MarcaModulo | undefined>(
      MODULO_KEY,
      context.getHandler(),
    );
    const daClasse = this.reflector.get<MarcaModulo | undefined>(
      MODULO_KEY,
      context.getClass(),
    );
    const modulo = doMetodo?.modulo ?? daClasse?.modulo;
    if (!modulo) return true;

    const request = context
      .switchToHttp()
      .getRequest<{ method: string; user?: JwtPayload }>();
    const fazendaId = request.user?.fazendaId;
    if (!fazendaId) {
      throw new ForbiddenException({
        statusCode: 403,
        codigo: 'MODULO_NAO_CONTRATADO',
        message: 'Módulo não contratado',
      });
    }

    const tipo: TipoAcao =
      doMetodo?.tipo ??
      daClasse?.tipo ??
      (request.method === 'GET' ? 'CONSULTA' : 'LANCAMENTO');
    const situacao = await this.acesso.situacao(fazendaId, modulo);

    if (situacao === 'ATIVO') return true;
    if (situacao === 'SO_CONSULTA' && tipo === 'CONSULTA') return true;
    if (situacao === 'SO_CONSULTA') {
      throw new ForbiddenException({
        statusCode: 403,
        codigo: 'MODULO_SO_CONSULTA',
        message: 'Módulo desativado: só consulta',
      });
    }
    throw new ForbiddenException({
      statusCode: 403,
      codigo: 'MODULO_NAO_CONTRATADO',
      message: 'Módulo não contratado',
    });
  }
}
