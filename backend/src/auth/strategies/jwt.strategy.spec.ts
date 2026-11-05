import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

// Estratégia das fazendas: usuário e fazenda conferidos a cada requisição
describe('JwtStrategy (spec 002, FR-018 e FR-026)', () => {
  const usuarioRepository = { findOne: jest.fn() };
  const config = { getOrThrow: () => 'segredo-de-teste' };
  const strategy = new JwtStrategy(config as never, usuarioRepository as never);
  const payload = { sub: 'u1', fazendaId: 'f1', papel: 'DONO' };

  beforeEach(() => {
    jest.clearAllMocks();
    usuarioRepository.findOne.mockResolvedValue({
      id: 'u1',
      fazendaId: 'f1',
      papel: 'DONO',
      ativo: true,
      fazenda: { suspensa: false },
    });
  });

  it('usuário ativo de fazenda ativa passa', async () => {
    await expect(strategy.validate(payload)).resolves.toEqual(payload);
  });

  it('token do administrador (aud admin) é recusado sem consultar o banco', async () => {
    await expect(
      strategy.validate({ ...payload, aud: 'admin' }),
    ).rejects.toThrow(UnauthorizedException);
    expect(usuarioRepository.findOne).not.toHaveBeenCalled();
  });

  it('fazenda suspensa: 403 ACESSO_SUSPENSO na próxima requisição', async () => {
    usuarioRepository.findOne.mockResolvedValue({
      id: 'u1',
      ativo: true,
      fazenda: { suspensa: true },
    });
    const erro = await strategy.validate(payload).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ForbiddenException);
    expect((erro as ForbiddenException).getResponse()).toMatchObject({
      codigo: 'ACESSO_SUSPENSO',
      message: 'Acesso suspenso · fale com o suporte',
    });
  });

  it('usuário desativado ou inexistente: 401', async () => {
    usuarioRepository.findOne.mockResolvedValue({ id: 'u1', ativo: false });
    await expect(strategy.validate(payload)).rejects.toThrow(
      UnauthorizedException,
    );
    usuarioRepository.findOne.mockResolvedValue(null);
    await expect(strategy.validate(payload)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('token emitido antes da última troca de senha: 401; o emitido depois passa (spec 007)', async () => {
    const trocaEm = new Date('2026-11-05T12:00:00Z');
    usuarioRepository.findOne.mockResolvedValue({
      id: 'u1', fazendaId: 'f1', papel: 'DONO', ativo: true, fazenda: { suspensa: false },
      senhaAlteradaEm: trocaEm, precisaTrocarSenha: false,
    });
    const antes = Math.floor(trocaEm.getTime() / 1000) - 60;
    await expect(strategy.validate({ ...payload, iat: antes })).rejects.toThrow(UnauthorizedException);
    const depois = Math.floor(trocaEm.getTime() / 1000);
    await expect(strategy.validate({ ...payload, iat: depois })).resolves.toMatchObject({ sub: 'u1', precisaTrocarSenha: false });
  });
});
