import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';

export const MAX_REQUISICOES_POR_MINUTO = 60;
const JANELA_MS = 60 * 1000;

// Limite simples de requisições por endereço para rotas públicas (sem login),
// para dificultar que alguém varra códigos de etiqueta em sequência (spec 007,
// FR-008). Quem escaneia brincos no curral nunca chega perto de 60 por minuto.
// Fica em memória: basta para uma instância; com várias, precisaria de um
// armazenamento comum. Atrás do proxy, o endereço real vem do trust proxy.
@Injectable()
export class LimitePorIpGuard implements CanActivate {
  private readonly logger = new Logger(LimitePorIpGuard.name);
  private readonly acessos = new Map<string, { quantidade: number; desde: number }>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ ip?: string }>();
    const ip = request.ip ?? 'desconhecido';
    const agora = Date.now();

    if (this.acessos.size > 10000) {
      for (const [chave, acesso] of this.acessos) {
        if (agora - acesso.desde > JANELA_MS) this.acessos.delete(chave);
      }
    }

    const acesso = this.acessos.get(ip);
    if (!acesso || agora - acesso.desde > JANELA_MS) {
      this.acessos.set(ip, { quantidade: 1, desde: agora });
      return true;
    }
    if (acesso.quantidade >= MAX_REQUISICOES_POR_MINUTO) {
      // Registra só na primeira recusa do minuto, para não encher o log (FR-009)
      if (acesso.quantidade === MAX_REQUISICOES_POR_MINUTO) {
        this.logger.warn(`Consulta pública limitada para o endereço ${ip}`);
        acesso.quantidade++;
      }
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          codigo: 'MUITAS_CONSULTAS',
          message: 'Muitas consultas seguidas. Aguarde um minuto e tente de novo.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    acesso.quantidade++;
    return true;
  }
}
