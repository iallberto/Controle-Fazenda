import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';

const MAX_REQUISICOES = 30;
const JANELA_MS = 60 * 1000;

// Limite simples de requisições por IP para rotas públicas (sem login), para
// dificultar que alguém varra códigos de etiqueta em sequência. Fica em memória:
// basta para uma instância; com várias, precisaria de um armazenamento comum.
@Injectable()
export class LimitePorIpGuard implements CanActivate {
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
    if (acesso.quantidade >= MAX_REQUISICOES) {
      throw new HttpException(
        'Muitas consultas seguidas. Aguarde um minuto e tente de novo.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    acesso.quantidade++;
    return true;
  }
}
