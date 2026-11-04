import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AdminAuthService } from './admin-auth.service';

describe('AdminAuthService (FR-018, FR-018a)', () => {
  const adminRepo = { findOneBy: jest.fn() };
  const tentativaRepo = { find: jest.fn(), insert: jest.fn() };
  const jwt = { sign: jest.fn(() => 'token-admin') };
  let service: AdminAuthService;
  let senhaHash: string;
  const AGORA = new Date('2026-11-04T12:00:00Z').getTime();
  const minutosAtras = (m: number) => new Date(AGORA - m * 60_000);

  beforeAll(async () => {
    senhaHash = await bcrypt.hash('SenhaForte123', 4);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(AGORA);
    tentativaRepo.find.mockResolvedValue([]);
    adminRepo.findOneBy.mockResolvedValue({
      id: 'a1',
      nome: 'Dono do software',
      email: 'admin@teste.local',
      senhaHash,
      ativo: true,
    });
    service = new AdminAuthService(
      adminRepo as never,
      tentativaRepo as never,
      jwt as never,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  const dto = { email: 'admin@teste.local', senha: 'SenhaForte123' };

  it('login certo emite token com aud admin e grava a tentativa', async () => {
    const resposta = await service.login(dto, '10.0.0.1');
    expect(jwt.sign).toHaveBeenCalledWith(
      { sub: 'a1', papel: 'ADMIN' },
      { audience: 'admin' },
    );
    expect(resposta).toEqual({
      accessToken: 'token-admin',
      administrador: {
        id: 'a1',
        nome: 'Dono do software',
        email: 'admin@teste.local',
      },
    });
    expect(tentativaRepo.insert).toHaveBeenCalledWith({
      email: 'admin@teste.local',
      sucesso: true,
      ip: '10.0.0.1',
    });
  });

  it('senha errada: 401 e tentativa gravada como falha', async () => {
    await expect(service.login({ ...dto, senha: 'errada' })).rejects.toThrow(
      UnauthorizedException,
    );
    expect(tentativaRepo.insert).toHaveBeenCalledWith(
      expect.objectContaining({ sucesso: false }),
    );
  });

  it('e-mail que não existe: 401 com a mesma mensagem', async () => {
    adminRepo.findOneBy.mockResolvedValue(null);
    await expect(service.login(dto)).rejects.toThrow('E-mail ou senha');
  });

  it('administrador inativo: 401', async () => {
    adminRepo.findOneBy.mockResolvedValue({
      id: 'a1',
      senhaHash,
      ativo: false,
    });
    await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
  });

  it('5 falhas seguidas em 15 min: 429 mesmo com a senha certa, com os minutos que faltam', async () => {
    tentativaRepo.find.mockResolvedValue(
      [1, 2, 3, 4, 6].map((m) => ({
        sucesso: false,
        criadoEm: minutosAtras(m),
      })),
    );
    await expect(service.login(dto)).rejects.toMatchObject({
      status: 429,
      response: expect.objectContaining({
        codigo: 'LOGIN_BLOQUEADO',
        message: 'Muitas tentativas. Tente de novo em 9 minutos',
      }),
    });
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  it('um acerto no meio das últimas 5 desfaz o bloqueio', async () => {
    tentativaRepo.find.mockResolvedValue([
      { sucesso: false, criadoEm: minutosAtras(1) },
      { sucesso: false, criadoEm: minutosAtras(2) },
      { sucesso: true, criadoEm: minutosAtras(3) },
      { sucesso: false, criadoEm: minutosAtras(4) },
      { sucesso: false, criadoEm: minutosAtras(5) },
    ]);
    await expect(service.login(dto)).resolves.toHaveProperty('accessToken');
  });
});
