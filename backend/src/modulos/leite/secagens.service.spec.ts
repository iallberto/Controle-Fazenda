import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Animal, StatusAnimal } from '../../animal/entities/animal.entity';
import { Lactacao, MotivoFimLactacao } from './entities/lactacao.entity';
import { Secagem } from './entities/secagem.entity';
import { Ordenha } from './entities/ordenha.entity';
import { SecagensService } from './secagens.service';

const HOJE = '2026-11-04';

describe('SecagensService (spec 004, US3)', () => {
  const dados = new Map<unknown, unknown[]>();
  const manager = {
    find: jest.fn(async (entidade: unknown) => dados.get(entidade) ?? []),
    findOne: jest.fn(async (entidade: unknown, opcoes?: { where?: Record<string, unknown> }) => {
      const lista = (dados.get(entidade) ?? []) as Record<string, unknown>[];
      const where = opcoes?.where ?? {};
      return (
        lista.find((x) =>
          Object.entries(where).every(([k, v]) =>
            v !== null && typeof v === 'object' ? x[k] === null : x[k] === v,
          ),
        ) ?? null
      );
    }),
    create: jest.fn((_e: unknown, x: object) => ({ ...x })),
    save: jest.fn(async (x: object) => ({ id: 's-novo', ...x })),
    transaction: jest.fn(),
  };
  manager.transaction.mockImplementation((cb: (m: typeof manager) => unknown) => cb(manager));
  const situacao = { previsoesParto: jest.fn() };
  const configuracao = {
    valores: jest.fn(async () => ({ prazoSecagemDias: 60, janelaSecarDias: 15 })),
  };
  const service = new SecagensService(manager as never, situacao as never, configuracao as never);

  const vaca = (id: string, brinco: string) => ({
    id,
    brinco,
    fazendaId: 'f1',
    status: StatusAnimal.ATIVO,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    dados.clear();
    situacao.previsoesParto.mockResolvedValue(new Map());
  });

  describe('a secar (FR-019, FR-020)', () => {
    it('parto previsto − 60 dias, dentro da janela, atrasadas primeiro, com média de 7 dias', async () => {
      dados.set(Lactacao, [
        { id: 'l1', animalId: 'v1', inicio: '2026-03-01', fim: null, animal: vaca('v1', '10') },
        { id: 'l2', animalId: 'v2', inicio: '2026-04-01', fim: null, animal: vaca('v2', '20') },
        { id: 'l3', animalId: 'v3', inicio: '2026-05-01', fim: null, animal: vaca('v3', '30') },
      ]);
      situacao.previsoesParto.mockResolvedValue(
        new Map([
          ['v1', { data: '2027-01-13' }], // seca em 14/11: dentro dos 15 dias
          ['v2', { data: '2026-12-30' }], // seca em 31/10: atrasada
          ['v3', { data: '2027-03-01' }], // seca em 31/12: fora da janela
        ]),
      );
      dados.set(Ordenha, [
        { animalId: 'v1', data: '2026-11-03', litros: 10 },
        { animalId: 'v1', data: '2026-11-03', litros: 6 },
        { animalId: 'v1', data: '2026-11-04', litros: 14 },
      ]);

      const lista = await service.aSecar('f1', undefined, HOJE);
      expect(lista.map((v) => [v.brinco, v.secagemPlanejada, v.atrasada])).toEqual([
        ['20', '2026-10-31', true],
        ['10', '2026-11-14', false],
      ]);
      expect(lista[1].mediaUltimos7Dias).toBe(15);
    });

    it('sem prenhez confirmada, não há secagem planejada', async () => {
      dados.set(Lactacao, [
        { id: 'l1', animalId: 'v1', inicio: '2026-03-01', fim: null, animal: vaca('v1', '10') },
      ]);
      expect(await service.aSecar('f1', undefined, HOJE)).toEqual([]);
    });
  });

  describe('registrar (FR-021)', () => {
    it('encerra a lactação com SECAGEM na data', async () => {
      const lactacao = { id: 'l1', animalId: 'v1', inicio: '2026-03-01', fim: null, motivoFim: null };
      dados.set(Animal, [vaca('v1', '10')]);
      dados.set(Lactacao, [lactacao]);
      await service.registrar('f1', 'u1', { animalId: 'v1', data: HOJE }, HOJE);
      expect(manager.create).toHaveBeenCalledWith(
        Secagem,
        expect.objectContaining({ lactacaoId: 'l1', data: HOJE, criadoPorId: 'u1' }),
      );
      expect(lactacao).toMatchObject({ fim: HOJE, motivoFim: MotivoFimLactacao.SECAGEM });
    });

    it('data futura, antes do início ou vaca sem lactação → 400; outra fazenda → 404', async () => {
      dados.set(Animal, [vaca('v1', '10')]);
      dados.set(Lactacao, [{ id: 'l1', animalId: 'v1', inicio: '2026-10-01', fim: null }]);
      await expect(
        service.registrar('f1', 'u1', { animalId: 'v1', data: '2026-11-05' }, HOJE),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.registrar('f1', 'u1', { animalId: 'v1', data: '2026-09-01' }, HOJE),
      ).rejects.toBeInstanceOf(BadRequestException);
      dados.set(Lactacao, []);
      await expect(
        service.registrar('f1', 'u1', { animalId: 'v1', data: HOJE }, HOJE),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.registrar('f2', 'u1', { animalId: 'v1', data: HOJE }, HOJE),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('cancelar', () => {
    it('reabre a lactação e guarda o motivo', async () => {
      const lactacao = { id: 'l1', animalId: 'v1', inicio: '2026-03-01', fim: HOJE, motivoFim: 'SECAGEM' };
      const secagem = { id: 's1', fazendaId: 'f1', lactacaoId: 'l1', cancelamento: { cancelado: false } };
      dados.set(Secagem, [secagem]);
      dados.set(Lactacao, [lactacao]);
      dados.set(Animal, [vaca('v1', '10')]);
      await service.cancelar('f1', 'u1', 's1', 'Secou a vaca errada');
      expect(lactacao).toMatchObject({ fim: null, motivoFim: null });
      expect(secagem.cancelamento).toMatchObject({ cancelado: true, motivoCancelamento: 'Secou a vaca errada' });
    });

    it('com lactação mais nova → 409', async () => {
      dados.set(Secagem, [{ id: 's1', fazendaId: 'f1', lactacaoId: 'l1', cancelamento: { cancelado: false } }]);
      dados.set(Lactacao, [
        { id: 'l1', animalId: 'v1', inicio: '2026-03-01', fim: '2026-09-01' },
        { id: 'l2', animalId: 'v1', inicio: '2026-11-01', fim: null },
      ]);
      dados.set(Animal, [vaca('v1', '10')]);
      await expect(service.cancelar('f1', 'u1', 's1', 'x')).rejects.toBeInstanceOf(ConflictException);
    });

    it('secagem de outra fazenda → 404', async () => {
      dados.set(Secagem, [{ id: 's1', fazendaId: 'f2', lactacaoId: 'l1', cancelamento: { cancelado: false } }]);
      await expect(service.cancelar('f1', 'u1', 's1', 'x')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
