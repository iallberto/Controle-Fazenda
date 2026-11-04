import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Animal, Sexo } from '../../animal/entities/animal.entity';
import { ModoOrdenha } from './entities/configuracao-leite.entity';
import { Lactacao } from './entities/lactacao.entity';
import { Ordenha, TipoOrdenha } from './entities/ordenha.entity';
import { CarenciaLeite } from './entities/carencia-leite.entity';
import { OrdenhasService } from './ordenhas.service';

const HOJE = '2026-11-04';

describe('OrdenhasService (spec 004, US1 e US2)', () => {
  const dados = new Map<unknown, unknown[]>();
  const manager = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((_e: unknown, x: object) => ({ ...x })),
    save: jest.fn(async (x: object) => ({ id: 'o-novo', ...x })),
  };
  const configuracao = { modo: ModoOrdenha.POR_VACA, ordenhasPorDia: 2 };
  const configuracaoService = { obter: jest.fn(async () => configuracao) };
  const service = new OrdenhasService(manager as never, configuracaoService as never);

  let ordenhaExistente: unknown;

  beforeEach(() => {
    jest.clearAllMocks();
    dados.clear();
    configuracao.modo = ModoOrdenha.POR_VACA;
    ordenhaExistente = null;
    dados.set(Animal, [{ id: 'v1', fazendaId: 'f1', brinco: '12', sexo: Sexo.F }]);
    dados.set(Lactacao, [
      { id: 'l1', animalId: 'v1', inicio: '2026-10-01', fim: null, animal: { brinco: '12' } },
    ]);
    manager.find.mockImplementation(async (entidade: unknown) => dados.get(entidade) ?? []);
    manager.findOne.mockImplementation(async (entidade: unknown) => {
      if (entidade === Ordenha) return ordenhaExistente;
      return (dados.get(entidade) ?? [])[0] ?? null;
    });
  });

  const dto = { data: HOJE, turno: 1, animalId: 'v1', litros: 12.5 };

  describe('gravarVaca', () => {
    it('grava os litros ligados à lactação, sem descarte', async () => {
      const r = await service.gravarVaca('f1', 'u1', dto, HOJE);
      expect(r).toMatchObject({ litros: 12.5, descarte: false, carenciaAte: null });
      expect(manager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: TipoOrdenha.VACA,
          lactacaoId: 'l1',
          criadoPorId: 'u1',
        }),
      );
    });

    it('a mesma vaca, data e turno substitui (não soma) e guarda quem alterou', async () => {
      ordenhaExistente = { id: 'o1', litros: 10, criadoPorId: 'u0' };
      await service.gravarVaca('f1', 'u1', dto, HOJE);
      expect(manager.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'o1', litros: 12.5, atualizadoPorId: 'u1' }),
      );
      expect(manager.create).not.toHaveBeenCalled();
    });

    it('vaca em carência: os litros ficam como descarte (FR-016)', async () => {
      dados.set(CarenciaLeite, [{ animalId: 'v1', data: '2026-11-02', dataFim: '2026-11-06' }]);
      const r = await service.gravarVaca('f1', 'u1', dto, HOJE);
      expect(r).toMatchObject({ descarte: true, carenciaAte: '2026-11-06' });
    });

    it('acima de 80 litros só com confirmação', async () => {
      await expect(
        service.gravarVaca('f1', 'u1', { ...dto, litros: 95 }, HOJE),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.gravarVaca('f1', 'u1', { ...dto, litros: 95, confirmarAcima: true }, HOJE),
      ).resolves.toMatchObject({ litros: 95 });
    });

    it('data futura, turno acima das ordenhas do dia ou vaca sem lactação → 400', async () => {
      await expect(
        service.gravarVaca('f1', 'u1', { ...dto, data: '2026-11-05' }, HOJE),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.gravarVaca('f1', 'u1', { ...dto, turno: 3 }, HOJE),
      ).rejects.toBeInstanceOf(BadRequestException);
      dados.set(Lactacao, [{ id: 'l1', animalId: 'v1', inicio: '2026-01-01', fim: '2026-09-01' }]);
      await expect(service.gravarVaca('f1', 'u1', dto, HOJE)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('vaca de outra fazenda → 404', async () => {
      dados.set(Animal, [{ id: 'v1', fazendaId: 'f2' }]);
      await expect(service.gravarVaca('f1', 'u1', dto, HOJE)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('modo só tanque: só a vaca em carência é lançada uma a uma (FR-012a)', async () => {
      configuracao.modo = ModoOrdenha.TANQUE;
      await expect(service.gravarVaca('f1', 'u1', dto, HOJE)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      dados.set(CarenciaLeite, [{ animalId: 'v1', data: '2026-11-02', dataFim: '2026-11-06' }]);
      await expect(service.gravarVaca('f1', 'u1', dto, HOJE)).resolves.toMatchObject({
        descarte: true,
      });
    });
  });

  describe('gravarTanque', () => {
    it('só no modo tanque; substitui o do mesmo turno', async () => {
      await expect(
        service.gravarTanque('f1', 'u1', { data: HOJE, turno: 1, litros: 300 }, HOJE),
      ).rejects.toBeInstanceOf(BadRequestException);
      configuracao.modo = ModoOrdenha.TANQUE;
      ordenhaExistente = { id: 't1', litros: 250 };
      await service.gravarTanque('f1', 'u1', { data: HOJE, turno: 1, litros: 300 }, HOJE);
      expect(manager.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 't1', litros: 300, atualizadoPorId: 'u1' }),
      );
    });
  });

  describe('turno', () => {
    it('lista as vacas em lactação com DEL, litros anteriores e carência', async () => {
      dados.set(Ordenha, [
        { animalId: 'v1', data: '2026-11-03', turno: 2, litros: 11, descarte: false },
        { animalId: 'v1', data: '2026-11-03', turno: 1, litros: 9, descarte: false },
        { animalId: 'v1', data: HOJE, turno: 2, litros: 14, descarte: false },
      ]);
      const r = await service.turno('f1', 'u1', { data: HOJE, turno: 1 });
      expect(r).toMatchObject({ modo: 'POR_VACA', data: HOJE, turno: 1 });
      expect(r.vacas).toEqual([
        expect.objectContaining({
          animalId: 'v1',
          brinco: '12',
          del: 34,
          litrosAnterior: 11,
          litros: null,
          carenciaAte: null,
        }),
      ]);
    });

    it('turno pela hora quando não informado', async () => {
      const r = await service.turno('f1', 'u1', { data: HOJE }, new Date(2026, 10, 4, 16));
      expect(r.turno).toBe(2);
    });

    it('modo tanque: só as vacas em carência aparecem', async () => {
      configuracao.modo = ModoOrdenha.TANQUE;
      let r = await service.turno('f1', 'u1', { data: HOJE, turno: 1 });
      expect(r.vacas).toEqual([]);
      dados.set(CarenciaLeite, [{ animalId: 'v1', data: '2026-11-02', dataFim: '2026-11-06' }]);
      r = await service.turno('f1', 'u1', { data: HOJE, turno: 1 });
      expect(r.vacas).toHaveLength(1);
    });
  });

  it('dia: total por vaca e da fazenda, com leite para o tanque e descartado (FR-013)', async () => {
    dados.set(Ordenha, [
      { tipo: TipoOrdenha.VACA, animalId: 'v1', animal: { brinco: '12' }, turno: 1, litros: 10, descarte: false },
      { tipo: TipoOrdenha.VACA, animalId: 'v1', animal: { brinco: '12' }, turno: 2, litros: 8.5, descarte: false },
      { tipo: TipoOrdenha.VACA, animalId: 'v2', animal: { brinco: '3' }, turno: 1, litros: 6, descarte: true },
      { tipo: TipoOrdenha.TANQUE, animalId: null, turno: 2, litros: 100, descarte: false },
    ]);
    const r = await service.dia('f1', HOJE);
    expect(r.paraTanque).toBe(118.5);
    expect(r.descartado).toBe(6);
    expect(r.tanque).toEqual({ 2: 100 });
    expect(r.vacas.map((v) => [v.brinco, v.total, v.descarte])).toEqual([
      ['3', 6, 6],
      ['12', 18.5, 0],
    ]);
  });
});
