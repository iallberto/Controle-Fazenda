import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { AdminFazendasService } from './admin-fazendas.service';
import { ModuloPago } from '../acesso/modulo-pago';
import { ModuloFazenda } from '../acesso/entities/modulo-fazenda.entity';
import { SuspensaoFazenda } from './entities/suspensao-fazenda.entity';
import { Fazenda } from '../../fazenda/entities/fazenda.entity';

describe('AdminFazendasService (FR-019 a FR-027)', () => {
  const manager = {
    findOne: jest.fn(),
    find: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const fazendaRepo = {
    find: jest.fn(),
    findOneBy: jest.fn(),
    manager: { transaction: jest.fn() },
  };
  const usuarioRepo = { createQueryBuilder: jest.fn(), findOne: jest.fn(), save: jest.fn() };
  const moduloRepo = { find: jest.fn(), findOne: jest.fn(), update: jest.fn() };
  const suspensaoRepo = { find: jest.fn() };
  const acesso = { limparCache: jest.fn() };
  let service: AdminFazendasService;

  const HOJE = '2026-11-04';
  const fazendaA = {
    id: 'f1',
    nome: 'Fazenda São João',
    criadoEm: new Date(),
    suspensa: false,
  };

  beforeEach(() => {
    jest.resetAllMocks();
    fazendaRepo.manager.transaction.mockImplementation(
      (cb: (m: typeof manager) => unknown) => cb(manager),
    );
    fazendaRepo.findOneBy.mockResolvedValue({ ...fazendaA });
    manager.findOne.mockResolvedValue({ ...fazendaA });
    manager.find.mockResolvedValue([]);
    const qb = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest
        .fn()
        .mockResolvedValue([{ fazendaId: 'f1', total: '3' }]),
    };
    usuarioRepo.createQueryBuilder.mockReturnValue(qb);
    service = new AdminFazendasService(
      fazendaRepo as never,
      usuarioRepo as never,
      moduloRepo as never,
      suspensaoRepo as never,
      acesso as never,
    );
  });

  describe('listar', () => {
    beforeEach(() => {
      fazendaRepo.find.mockResolvedValue([
        { ...fazendaA },
        {
          id: 'f2',
          nome: 'Sítio Boa Vista',
          criadoEm: new Date(),
          suspensa: true,
        },
      ]);
      moduloRepo.find.mockResolvedValue([
        {
          fazendaId: 'f1',
          modulo: ModuloPago.FINANCEIRO,
          dataInicio: '2026-01-01',
          dataTermino: null,
          desativadoEm: null,
        },
      ]);
    });

    it('lista fazendas com usuários ativos, suspensão e módulos, sem dados de rebanho', async () => {
      const [primeira, segunda] = await service.listar(undefined, HOJE);
      expect(Object.keys(primeira).sort()).toEqual(
        [
          'criadaEm',
          'id',
          'modulos',
          'nome',
          'suspensa',
          'usuariosAtivos',
        ].sort(),
      );
      expect(primeira.usuariosAtivos).toBe(3);
      expect(
        primeira.modulos.find((m) => m.modulo === 'FINANCEIRO')?.situacao,
      ).toBe('ATIVO');
      expect(segunda).toMatchObject({ suspensa: true, usuariosAtivos: 0 });
    });

    it('busca pelo nome sem ligar para acento nem maiúscula', async () => {
      const lista = await service.listar('sao joao', HOJE);
      expect(lista.map((f) => f.id)).toEqual(['f1']);
    });
  });

  describe('liberar', () => {
    it('cria o período, grava quem liberou e limpa o cache', async () => {
      await service.liberar(
        'admin1',
        'f1',
        {
          modulo: ModuloPago.LEITE,
          dataInicio: HOJE,
          dataTermino: '2026-12-31',
        },
        HOJE,
      );
      expect(manager.insert).toHaveBeenCalledWith(ModuloFazenda, {
        fazendaId: 'f1',
        modulo: ModuloPago.LEITE,
        dataInicio: HOJE,
        dataTermino: '2026-12-31',
        liberadoPorId: 'admin1',
      });
      expect(acesso.limparCache).toHaveBeenCalledWith('f1');
    });

    it('término antes do início: 400', async () => {
      await expect(
        service.liberar(
          'admin1',
          'f1',
          {
            modulo: ModuloPago.LEITE,
            dataInicio: HOJE,
            dataTermino: '2026-11-03',
          },
          HOJE,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('já há período vigente ou futuro: 409', async () => {
      manager.find.mockResolvedValue([
        { dataInicio: '2026-12-01', dataTermino: null, desativadoEm: null },
      ]);
      await expect(
        service.liberar(
          'admin1',
          'f1',
          { modulo: ModuloPago.LEITE, dataInicio: HOJE },
          HOJE,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('período antigo desativado ou vencido não impede liberar de novo', async () => {
      manager.find.mockResolvedValue([
        {
          dataInicio: '2025-01-01',
          dataTermino: null,
          desativadoEm: new Date(),
        },
        {
          dataInicio: '2025-01-01',
          dataTermino: '2026-11-03',
          desativadoEm: null,
        },
      ]);
      await service.liberar(
        'admin1',
        'f1',
        { modulo: ModuloPago.LEITE, dataInicio: HOJE },
        HOJE,
      );
      expect(manager.insert).toHaveBeenCalled();
    });

    it('fazenda inexistente: 404', async () => {
      manager.findOne.mockResolvedValue(null);
      await expect(
        service.liberar(
          'admin1',
          'f9',
          { modulo: ModuloPago.LEITE, dataInicio: HOJE },
          HOJE,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('desativar', () => {
    it('preenche quem desativou e limpa o cache', async () => {
      moduloRepo.findOne.mockResolvedValue({
        id: 'p1',
        fazendaId: 'f1',
        desativadoEm: null,
      });
      await service.desativar('admin1', 'p1');
      expect(moduloRepo.update).toHaveBeenCalledWith(
        { id: 'p1' },
        expect.objectContaining({
          desativadoPorId: 'admin1',
          desativadoEm: expect.any(Date),
        }),
      );
      expect(acesso.limparCache).toHaveBeenCalledWith('f1');
    });

    it('já desativado: 400; inexistente: 404', async () => {
      moduloRepo.findOne.mockResolvedValue({
        id: 'p1',
        fazendaId: 'f1',
        desativadoEm: new Date(),
      });
      await expect(service.desativar('admin1', 'p1')).rejects.toThrow(
        BadRequestException,
      );
      moduloRepo.findOne.mockResolvedValue(null);
      await expect(service.desativar('admin1', 'p1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('suspender e reativar (FR-025 a FR-027)', () => {
    it('suspende com motivo, marca a fazenda e não toca nos módulos', async () => {
      await service.suspender('admin1', 'f1', '  sem pagamento  ');
      expect(manager.insert).toHaveBeenCalledWith(SuspensaoFazenda, {
        fazendaId: 'f1',
        motivo: 'sem pagamento',
        suspensaPorId: 'admin1',
      });
      expect(manager.update).toHaveBeenCalledWith(
        Fazenda,
        { id: 'f1' },
        { suspensa: true },
      );
      expect(manager.update).not.toHaveBeenCalledWith(
        ModuloFazenda,
        expect.anything(),
        expect.anything(),
      );
      expect(acesso.limparCache).toHaveBeenCalledWith('f1');
    });

    it('fazenda já suspensa: 400', async () => {
      manager.findOne.mockResolvedValue({ ...fazendaA, suspensa: true });
      await expect(service.suspender('admin1', 'f1', 'motivo')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('reativa fechando a suspensão aberta', async () => {
      manager.findOne.mockImplementation(async (entidade: unknown) =>
        entidade === Fazenda
          ? { ...fazendaA, suspensa: true }
          : { id: 's1', fazendaId: 'f1', reativadaEm: null },
      );
      await service.reativar('admin1', 'f1');
      expect(manager.update).toHaveBeenCalledWith(
        SuspensaoFazenda,
        { id: 's1' },
        expect.objectContaining({
          reativadaPorId: 'admin1',
          reativadaEm: expect.any(Date),
        }),
      );
      expect(manager.update).toHaveBeenCalledWith(
        Fazenda,
        { id: 'f1' },
        { suspensa: false },
      );
    });

    it('reativar fazenda que não está suspensa: 400', async () => {
      await expect(service.reativar('admin1', 'f1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('fazenda nova e senha do dono pelo administrador (spec 007)', () => {
    it('cria fazenda e dono na mesma transação, com senha provisória e troca obrigatória', async () => {
      manager.findOne.mockResolvedValue(null);
      manager.create.mockImplementation((_e: unknown, x: object) => ({ ...x }));
      manager.save.mockImplementationOnce(async (x: object) => ({ id: 'f-nova', ...x }))
        .mockImplementationOnce(async (x: object) => x);
      const r = await service.criarFazenda({ nomeFazenda: ' Fazenda Nova ', nomeDono: 'Dono', emailDono: 'dono@teste.local' });
      expect(r.fazendaId).toBe('f-nova');
      expect(r.senhaProvisoria).toHaveLength(10);
      const dono = manager.save.mock.calls[1][0];
      expect(dono).toMatchObject({ fazendaId: 'f-nova', papel: 'DONO', precisaTrocarSenha: true, email: 'dono@teste.local' });
      expect(dono.senhaHash).not.toBe(r.senhaProvisoria);
      expect(manager.save.mock.calls[0][0]).toMatchObject({ nome: 'Fazenda Nova' });
    });

    it('e-mail já usado: 409 e nada criado', async () => {
      manager.findOne.mockResolvedValue({ id: 'u-existente' });
      await expect(
        service.criarFazenda({ nomeFazenda: 'X', nomeDono: 'Y', emailDono: 'dono@teste.local' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('redefinir a senha do dono: provisória, troca obrigatória e hora gravada; sem dono ativo → 404', async () => {
      const dono = { id: 'u1', nome: 'Dono', email: 'd@t.l', senhaHash: 'x', precisaTrocarSenha: false, senhaAlteradaEm: null };
      usuarioRepo.findOne.mockResolvedValue(dono);
      const r = await service.redefinirSenhaDono('f1');
      expect(r.senhaProvisoria).toHaveLength(10);
      expect(dono).toMatchObject({ precisaTrocarSenha: true });
      expect(dono.senhaAlteradaEm).toBeInstanceOf(Date);
      expect(usuarioRepo.findOne).toHaveBeenCalledWith(expect.objectContaining({
        where: { fazendaId: 'f1', papel: 'DONO', ativo: true, suporte: false },
      }));
      usuarioRepo.findOne.mockResolvedValue(null);
      await expect(service.redefinirSenhaDono('f1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
