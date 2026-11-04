import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  Animal,
  Sexo,
  StatusAnimal,
  VacaDeLeite,
} from '../../animal/entities/animal.entity';
import { Parto } from '../../parto/entities/parto.entity';
import { Lactacao, OrigemLactacao } from './entities/lactacao.entity';
import { Ordenha } from './entities/ordenha.entity';
import { CarenciaLeite } from './entities/carencia-leite.entity';
import { LactacoesService } from './lactacoes.service';
import { VacasService } from './vacas.service';

// Simula o EntityManager respondendo por entidade
function managerFalso() {
  const dados = new Map<unknown, unknown[]>();
  const manager = {
    dados,
    find: jest.fn(async (entidade: unknown) => dados.get(entidade) ?? []),
    findOne: jest.fn(async (entidade: unknown, opcoes?: { where?: { id?: string } }) => {
      const lista = (dados.get(entidade) ?? []) as { id?: string }[];
      const id = opcoes?.where?.id;
      return (id ? lista.find((x) => x.id === id) : lista[0]) ?? null;
    }),
    create: jest.fn((_e: unknown, x: object) => ({ ...x })),
    save: jest.fn(async (x: object) => ({ id: 'novo', ...x })),
    update: jest.fn(),
  };
  return manager;
}

const HOJE = '2026-11-04';

const vaca = (extra: Partial<Animal> = {}) =>
  ({
    id: 'v1',
    fazendaId: 'f1',
    brinco: '12',
    sexo: Sexo.F,
    status: StatusAnimal.ATIVO,
    vacaDeLeite: VacaDeLeite.PELA_RACA,
    raca: { nome: 'Holandesa', leiteira: true },
    ...extra,
  }) as Animal;

describe('VacasService e LactacoesService (spec 004, US1)', () => {
  let manager: ReturnType<typeof managerFalso>;
  let vacas: VacasService;
  let lactacoes: LactacoesService;

  beforeEach(() => {
    manager = managerFalso();
    const secagens = { planejadas: jest.fn(async () => new Map()), daLactacao: jest.fn(async () => new Map()) };
    vacas = new VacasService(manager as never, secagens as never);
    lactacoes = new LactacoesService(manager as never, vacas);
  });

  describe('iniciar lactação à mão (FR-006)', () => {
    const dto = { animalId: 'v1', inicio: '2026-07-27' };

    it('cria a lactação MANUAL da vaca de leite', async () => {
      manager.dados.set(Animal, [vaca()]);
      await lactacoes.iniciar('f1', 'u1', dto, HOJE);
      expect(manager.create).toHaveBeenCalledWith(Lactacao, {
        fazendaId: 'f1',
        animalId: 'v1',
        inicio: '2026-07-27',
        origem: OrigemLactacao.MANUAL,
        partoId: null,
        fim: null,
        motivoFim: null,
        criadoPorId: 'u1',
      });
    });

    it('início no futuro → 400', async () => {
      manager.dados.set(Animal, [vaca()]);
      await expect(
        lactacoes.iniciar('f1', 'u1', { ...dto, inicio: '2026-11-05' }, HOJE),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('não é vaca de leite → 400', async () => {
      manager.dados.set(Animal, [vaca({ raca: { leiteira: false } as never })]);
      await expect(lactacoes.iniciar('f1', 'u1', dto, HOJE)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('já em lactação → 409', async () => {
      manager.dados.set(Animal, [vaca()]);
      manager.dados.set(Lactacao, [{ id: 'l1', inicio: '2026-01-01', fim: null }]);
      await expect(lactacoes.iniciar('f1', 'u1', dto, HOJE)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('sobreposta a uma lactação encerrada → 400', async () => {
      manager.dados.set(Animal, [vaca()]);
      manager.dados.set(Lactacao, [{ id: 'l1', inicio: '2026-01-01', fim: '2026-08-10' }]);
      await expect(lactacoes.iniciar('f1', 'u1', dto, HOJE)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('vaca de outra fazenda ou macho → 404', async () => {
      manager.dados.set(Animal, [vaca({ fazendaId: 'f2' })]);
      await expect(lactacoes.iniciar('f1', 'u1', dto, HOJE)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      manager.dados.set(Animal, [vaca({ sexo: Sexo.M })]);
      await expect(lactacoes.iniciar('f1', 'u1', dto, HOJE)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('com o parto informado, a origem é PARTO', async () => {
      manager.dados.set(Animal, [vaca()]);
      manager.dados.set(Parto, [{ id: 'p1', maeId: 'v1', data: '2026-07-27' }]);
      await lactacoes.iniciar('f1', 'u1', { ...dto, partoId: 'p1' }, HOJE);
      expect(manager.create).toHaveBeenCalledWith(
        Lactacao,
        expect.objectContaining({ origem: OrigemLactacao.PARTO, partoId: 'p1' }),
      );
    });
  });

  describe('lista e detalhe das vacas', () => {
    it('lista as vacas em lactação com DEL e carência, por brinco', async () => {
      manager.dados.set(Animal, [
        vaca({ id: 'v2', brinco: '100' }),
        vaca({ id: 'v1', brinco: '12' }),
        vaca({ id: 'v3', brinco: '7', raca: { nome: 'Nelore', leiteira: false } as never }),
      ]);
      manager.dados.set(Lactacao, [
        { id: 'l1', animalId: 'v1', inicio: '2026-10-25', fim: null },
        { id: 'l2', animalId: 'v2', inicio: '2026-01-01', fim: '2026-09-01' },
      ]);
      manager.dados.set(CarenciaLeite, [
        { animalId: 'v1', data: '2026-11-03', dataFim: '2026-11-06' },
      ]);

      const emLactacao = await vacas.listar('f1', 'EM_LACTACAO', HOJE);
      expect(emLactacao).toEqual([
        expect.objectContaining({ animalId: 'v1', del: 10, carenciaAte: '2026-11-06' }),
      ]);
      const todas = await vacas.listar('f1', 'TODAS', HOJE);
      // A Nelore sem marca não é vaca de leite
      expect(todas.map((v) => [v.brinco, v.situacao])).toEqual([
        ['12', 'EM_LACTACAO'],
        ['100', 'SECA'],
      ]);
    });

    it('detalhe resume a lactação atual (total, média por dia e pico)', async () => {
      manager.dados.set(Animal, [vaca()]);
      manager.dados.set(Lactacao, [{ id: 'l1', animalId: 'v1', inicio: '2026-11-01', fim: null }]);
      manager.dados.set(Ordenha, [
        { lactacaoId: 'l1', data: '2026-11-02', litros: 10 },
        { lactacaoId: 'l1', data: '2026-11-02', litros: 8.5 },
        { lactacaoId: 'l1', data: '2026-11-03', litros: 20 },
      ]);
      const detalhe = await vacas.detalhar('f1', 'v1', HOJE);
      expect(detalhe.lactacaoAtual).toMatchObject({
        del: 3,
        totalLitros: 38.5,
        mediaPorDia: 19.3,
        pico: 20,
        diasComOrdenha: 2,
      });
    });

    it('vaca de leite sem lactação e com parto recente: oferece iniciar (FR-004b)', async () => {
      manager.dados.set(Animal, [vaca({ vacaDeLeite: VacaDeLeite.SIM })]);
      manager.dados.set(Parto, [{ id: 'p1', maeId: 'v1', data: '2026-09-25' }]);
      const detalhe = await vacas.detalhar('f1', 'v1', HOJE);
      expect(detalhe.partoRecente).toEqual({ partoId: 'p1', data: '2026-09-25' });
    });

    it('parto de mais de 305 dias não é oferecido', async () => {
      manager.dados.set(Animal, [vaca()]);
      manager.dados.set(Parto, [{ id: 'p1', maeId: 'v1', data: '2025-12-01' }]);
      const detalhe = await vacas.detalhar('f1', 'v1', HOJE);
      expect(detalhe.partoRecente).toBeNull();
    });
  });
});
