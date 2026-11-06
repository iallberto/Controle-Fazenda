import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AcessoFazendaGuard, PERMITE_SEM_ACESSO } from './acesso-fazenda.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

describe('AcessoFazendaGuard (spec 008, FR-009a e FR-013)', () => {
  const marcas = new Set<string>();
  const reflector = { getAllAndOverride: (chave: string) => marcas.has(chave) } as unknown as Reflector;
  const acesso = { situacao: jest.fn() };
  const guard = new AcessoFazendaGuard(reflector, acesso as never);
  const contexto = (method: string, user: object) =>
    ({
      getHandler: () => null,
      getClass: () => null,
      switchToHttp: () => ({ getRequest: () => ({ method, user }) }),
    }) as never;
  const dono = { sub: 'u1', fazendaId: 'f1', papel: 'DONO' };

  beforeEach(() => {
    marcas.clear();
    acesso.situacao.mockReset();
  });

  it('vencida ou aguardando implantação: lançar recebe 403 FAZENDA_SO_CONSULTA', async () => {
    for (const situacao of ['VENCIDO', 'AGUARDANDO_IMPLANTACAO']) {
      acesso.situacao.mockResolvedValue({ situacao, podeLancar: false });
      const erro = await guard.canActivate(contexto('POST', dono)).catch((e: unknown) => e);
      expect(erro).toBeInstanceOf(ForbiddenException);
      expect((erro as ForbiddenException).getResponse()).toMatchObject({ codigo: 'FAZENDA_SO_CONSULTA', situacao });
    }
  });

  it('consulta (GET), suporte, rota pública e rota liberada passam sem consultar o prazo', async () => {
    acesso.situacao.mockResolvedValue({ situacao: 'VENCIDO', podeLancar: false });
    await expect(guard.canActivate(contexto('GET', dono))).resolves.toBe(true);
    await expect(guard.canActivate(contexto('POST', { ...dono, suporte: true }))).resolves.toBe(true);
    for (const marca of [IS_PUBLIC_KEY, PERMITE_SEM_ACESSO]) {
      marcas.clear();
      marcas.add(marca);
      await expect(guard.canActivate(contexto('POST', dono))).resolves.toBe(true);
    }
    expect(acesso.situacao).not.toHaveBeenCalled();
  });

  it('em dia, em carência ou sem prazo: lança', async () => {
    acesso.situacao.mockResolvedValue({ situacao: 'CARENCIA', podeLancar: true });
    await expect(guard.canActivate(contexto('PATCH', dono))).resolves.toBe(true);
  });
});
