import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SenhaProvisoriaGuard } from './senha-provisoria.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PERMITE_SENHA_PROVISORIA } from '../decorators/permite-senha-provisoria.decorator';
import { IS_AREA_ADMIN } from '../../modulos/admin/area-admin.decorator';

describe('SenhaProvisoriaGuard (spec 007, FR-004)', () => {
  const marcas = new Set<string>();
  const reflector = { getAllAndOverride: (chave: string) => marcas.has(chave) } as unknown as Reflector;
  const guard = new SenhaProvisoriaGuard(reflector);
  const contexto = (user: object | undefined) =>
    ({
      getHandler: () => null,
      getClass: () => null,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as never;

  beforeEach(() => marcas.clear());

  it('com senha provisória: 403 SENHA_PROVISORIA nas rotas de fazenda', () => {
    let erro: unknown;
    try {
      guard.canActivate(contexto({ sub: 'u1', precisaTrocarSenha: true }));
    } catch (e) {
      erro = e;
    }
    expect(erro).toBeInstanceOf(ForbiddenException);
    expect((erro as ForbiddenException).getResponse()).toMatchObject({ codigo: 'SENHA_PROVISORIA' });
  });

  it('a troca de senha, as rotas públicas e o painel passam', () => {
    for (const marca of [PERMITE_SENHA_PROVISORIA, IS_PUBLIC_KEY, IS_AREA_ADMIN]) {
      marcas.clear();
      marcas.add(marca);
      expect(guard.canActivate(contexto({ sub: 'u1', precisaTrocarSenha: true }))).toBe(true);
    }
  });

  it('sem senha provisória passa', () => {
    expect(guard.canActivate(contexto({ sub: 'u1', precisaTrocarSenha: false }))).toBe(true);
    expect(guard.canActivate(contexto({ sub: 'u1' }))).toBe(true);
  });
});
