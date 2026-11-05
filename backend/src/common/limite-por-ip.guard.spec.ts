import { HttpException } from '@nestjs/common';
import { LimitePorIpGuard, MAX_REQUISICOES_POR_MINUTO } from './limite-por-ip.guard';

describe('LimitePorIpGuard (spec 007, FR-008)', () => {
  const contexto = (ip: string) =>
    ({ switchToHttp: () => ({ getRequest: () => ({ ip }) }) }) as never;
  let agora = new Date('2026-11-05T10:00:00Z').getTime();

  beforeEach(() => {
    agora = new Date('2026-11-05T10:00:00Z').getTime();
    jest.spyOn(Date, 'now').mockImplementation(() => agora);
  });
  afterEach(() => jest.restoreAllMocks());

  it('60 consultas no minuto passam; a 61ª recebe 429 MUITAS_CONSULTAS', () => {
    const guard = new LimitePorIpGuard();
    for (let i = 0; i < MAX_REQUISICOES_POR_MINUTO; i++) {
      expect(guard.canActivate(contexto('1.2.3.4'))).toBe(true);
    }
    let erro: unknown;
    try {
      guard.canActivate(contexto('1.2.3.4'));
    } catch (e) {
      erro = e;
    }
    expect(erro).toBeInstanceOf(HttpException);
    expect((erro as HttpException).getStatus()).toBe(429);
    expect((erro as HttpException).getResponse()).toMatchObject({ codigo: 'MUITAS_CONSULTAS' });
  });

  it('outro endereço não é afetado; no minuto seguinte volta a passar', () => {
    const guard = new LimitePorIpGuard();
    for (let i = 0; i < MAX_REQUISICOES_POR_MINUTO; i++) guard.canActivate(contexto('1.2.3.4'));
    expect(guard.canActivate(contexto('5.6.7.8'))).toBe(true);
    agora += 61_000;
    expect(guard.canActivate(contexto('1.2.3.4'))).toBe(true);
  });
});
