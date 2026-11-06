import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { NAO_SUPORTE, SuporteGuard } from './suporte.guard';

describe('SuporteGuard (spec 008, FR-005)', () => {
  let marcado = true;
  const reflector = { getAllAndOverride: (chave: string) => chave === NAO_SUPORTE && marcado } as unknown as Reflector;
  const guard = new SuporteGuard(reflector);
  const contexto = (user: object) =>
    ({ getHandler: () => null, getClass: () => null, switchToHttp: () => ({ getRequest: () => ({ user }) }) }) as never;

  it('rota marcada com token de suporte: 403 ACAO_SO_DO_DONO', () => {
    marcado = true;
    let erro: unknown;
    try {
      guard.canActivate(contexto({ sub: 's', suporte: true }));
    } catch (e) {
      erro = e;
    }
    expect(erro).toBeInstanceOf(ForbiddenException);
    expect((erro as ForbiddenException).getResponse()).toMatchObject({ codigo: 'ACAO_SO_DO_DONO' });
  });

  it('dono de verdade passa; rota não marcada passa para o suporte', () => {
    marcado = true;
    expect(guard.canActivate(contexto({ sub: 'd' }))).toBe(true);
    marcado = false;
    expect(guard.canActivate(contexto({ sub: 's', suporte: true }))).toBe(true);
  });
});
