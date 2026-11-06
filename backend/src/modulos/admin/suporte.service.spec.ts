import { NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Usuario } from '../../usuario/entities/usuario.entity';
import { SessaoSuporte } from './entities/sessao-suporte.entity';
import { emailDoSuporte, SuporteService } from './suporte.service';

describe('SuporteService (spec 008, US1)', () => {
  const manager = {
    findOne: jest.fn(),
    create: jest.fn((_e: unknown, x: object) => ({ ...x })),
    save: jest.fn(),
  };
  const fazendaRepo = {
    findOneBy: jest.fn(),
    manager: { transaction: jest.fn((cb: (m: typeof manager) => unknown) => cb(manager)) },
  };
  const adminRepo = { findOneBy: jest.fn() };
  const sessaoRepo = { find: jest.fn() };
  const jwt = { sign: jest.fn(() => 'token-suporte') };
  const service = new SuporteService(fazendaRepo as never, adminRepo as never, sessaoRepo as never, jwt as never);

  beforeEach(() => {
    jest.clearAllMocks();
    fazendaRepo.findOneBy.mockResolvedValue({ id: 'f1', nome: 'Fazenda Cliente', suspensa: false });
    adminRepo.findOneBy.mockResolvedValue({ id: 'a1', nome: 'Alberto' });
    manager.save.mockImplementation(async (x: Record<string, unknown>) => ({ id: x.id ?? 'novo-id', ...x }));
  });

  it('primeira entrada: cria o usuário suporte (DONO, suporte, senha que ninguém conhece) e a sessão', async () => {
    manager.findOne.mockResolvedValue(null);
    const r = await service.entrar('a1', 'f1');
    const usuario = manager.save.mock.calls[0][0];
    expect(usuario).toMatchObject({
      fazendaId: 'f1',
      nome: 'Suporte · Alberto',
      email: emailDoSuporte('a1', 'f1'),
      papel: 'DONO',
      suporte: true,
    });
    expect(usuario.senhaHash).toBeTruthy();
    expect(manager.create).toHaveBeenCalledWith(SessaoSuporte, expect.objectContaining({ administradorId: 'a1', fazendaId: 'f1' }));
    expect(jwt.sign).toHaveBeenCalledWith(expect.objectContaining({ fazendaId: 'f1', papel: 'DONO', sessaoSuporteId: 'novo-id' }));
    expect(r).toMatchObject({ accessToken: 'token-suporte', usuario: { suporte: true }, fazenda: { nome: 'Fazenda Cliente' } });
  });

  it('entradas seguintes reaproveitam o mesmo usuário (histórico junto) e abrem nova sessão', async () => {
    const existente = { id: 'sup1', nome: 'Suporte · Alberto', ativo: true, senhaHash: await bcrypt.hash('x', 4) };
    manager.findOne.mockResolvedValue(existente);
    await service.entrar('a1', 'f1');
    expect(manager.findOne).toHaveBeenCalledWith(Usuario, { where: { email: emailDoSuporte('a1', 'f1') } });
    expect(manager.save).toHaveBeenCalledTimes(1);
    expect(manager.save.mock.calls[0][0]).toMatchObject({ usuarioId: 'sup1' });
  });

  it('fazenda inexistente: 404', async () => {
    fazendaRepo.findOneBy.mockResolvedValue(null);
    await expect(service.entrar('a1', 'x')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('sessões da fazenda: marca expirada sem saída e com mais de 8 h', async () => {
    const agora = new Date('2026-11-10T20:00:00Z').getTime();
    sessaoRepo.find.mockResolvedValue([
      { id: 's2', administrador: { nome: 'Alberto' }, entradaEm: new Date('2026-11-10T15:00:00Z'), saidaEm: null },
      { id: 's1', administrador: { nome: 'Alberto' }, entradaEm: new Date('2026-11-09T07:00:00Z'), saidaEm: null },
    ]);
    const r = await service.sessoesDaFazenda('f1', agora);
    expect(r.map((s) => s.expirada)).toEqual([false, true]);
  });
});
