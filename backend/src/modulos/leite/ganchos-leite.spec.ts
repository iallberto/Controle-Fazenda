import { UnprocessableEntityException } from '@nestjs/common';
import { Animal, Sexo, VacaDeLeite } from '../../animal/entities/animal.entity';
import { ganchosRebanho } from '../../common/ganchos-rebanho';
import { GanchosLeite } from './ganchos-leite';
import {
  Lactacao,
  MotivoFimLactacao,
  OrigemLactacao,
} from './entities/lactacao.entity';
import { ProdutoLeite } from './entities/produto-leite.entity';
import { CarenciaLeite } from './entities/carencia-leite.entity';
import { Ordenha } from './entities/ordenha.entity';

describe('GanchosLeite (spec 004, R1, R2, R6)', () => {
  const acesso = { situacao: jest.fn() };
  const manager = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  };
  const ganchos = new GanchosLeite(acesso as never);
  const m = manager as never;

  const vaca = (extra: Partial<Animal> = {}) => ({
    id: 'v1',
    fazendaId: 'f1',
    sexo: Sexo.F,
    vacaDeLeite: VacaDeLeite.PELA_RACA,
    raca: { leiteira: true },
    ...extra,
  });

  // findOne por entidade
  let porEntidade: Map<unknown, unknown[]>;
  const responder = (entidade: unknown, ...valores: unknown[]) =>
    porEntidade.set(entidade, valores);

  beforeEach(() => {
    jest.resetAllMocks();
    ganchosRebanho.limpar();
    porEntidade = new Map();
    acesso.situacao.mockResolvedValue('ATIVO');
    manager.findOne.mockImplementation(async (entidade: unknown) => {
      const fila = porEntidade.get(entidade);
      return fila && fila.length > 0 ? fila.shift() : null;
    });
    manager.find.mockResolvedValue([]);
    manager.create.mockImplementation((_e: unknown, dados: object) => ({ ...dados }));
    manager.save.mockImplementation(async (x: object) => x);
  });

  it('registra os quatro ganchos ao iniciar', async () => {
    ganchos.onModuleInit();
    responder(Animal, vaca());
    await ganchosRebanho.emitir('partoRegistrado', m, {
      fazendaId: 'f1',
      maeId: 'v1',
      partoId: 'p1',
      data: '2026-11-04',
      usuarioId: 'u1',
    });
    expect(manager.save).toHaveBeenCalled();
  });

  describe('partoRegistrado', () => {
    const parto = {
      fazendaId: 'f1',
      maeId: 'v1',
      partoId: 'p1',
      data: '2026-11-04',
      usuarioId: 'u1',
    };

    it.each(['ATIVO', 'SO_CONSULTA'])(
      'abre a lactação da vaca de leite com o Leite %s (vivo ou natimorto)',
      async (situacao) => {
        acesso.situacao.mockResolvedValue(situacao);
        responder(Animal, vaca());
        await ganchos.aoRegistrarParto(m, parto);
        expect(manager.create).toHaveBeenCalledWith(Lactacao, {
          fazendaId: 'f1',
          animalId: 'v1',
          inicio: '2026-11-04',
          origem: OrigemLactacao.PARTO,
          partoId: 'p1',
          fim: null,
          motivoFim: null,
          criadoPorId: 'u1',
        });
      },
    );

    it('vaca de corte (raça não leiteira, sem marca) não abre lactação', async () => {
      responder(Animal, vaca({ raca: { leiteira: false } as never }));
      await ganchos.aoRegistrarParto(m, parto);
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('vaca de corte marcada "vaca de leite: sim" abre', async () => {
      responder(Animal, vaca({ raca: null as never, vacaDeLeite: VacaDeLeite.SIM }));
      await ganchos.aoRegistrarParto(m, parto);
      expect(manager.create).toHaveBeenCalledWith(Lactacao, expect.anything());
    });

    it('Leite não contratado: nada', async () => {
      acesso.situacao.mockResolvedValue('NAO_CONTRATADO');
      await ganchos.aoRegistrarParto(m, parto);
      expect(manager.findOne).not.toHaveBeenCalled();
    });

    it('lactação aberta termina no dia anterior com NOVO_PARTO', async () => {
      const aberta = { id: 'l0', inicio: '2025-10-01', fim: null, motivoFim: null };
      responder(Animal, vaca());
      responder(Lactacao, aberta);
      await ganchos.aoRegistrarParto(m, parto);
      expect(aberta).toMatchObject({
        fim: '2026-11-03',
        motivoFim: MotivoFimLactacao.NOVO_PARTO,
      });
      // Fecha antes de abrir a nova (índice único da aberta)
      expect(manager.save.mock.calls[0][0]).toBe(aberta);
      expect(manager.save.mock.calls[1][0]).toMatchObject({ partoId: 'p1' });
    });

    it('parto lançado com atraso, antes da lactação aberta: nada muda', async () => {
      const aberta = { id: 'l0', inicio: '2026-11-10', fim: null };
      responder(Animal, vaca());
      responder(Lactacao, aberta);
      await ganchos.aoRegistrarParto(m, parto);
      expect(manager.save).not.toHaveBeenCalled();
    });
  });

  it('partoAlterado move o início da lactação e o fim da anterior', async () => {
    const lactacao = { id: 'l1', inicio: '2026-11-04' };
    const anterior = { id: 'l0', fim: '2026-11-03' };
    responder(Lactacao, lactacao, anterior);
    await ganchos.aoAlterarParto(m, {
      fazendaId: 'f1',
      maeId: 'v1',
      partoId: 'p1',
      dataAnterior: '2026-11-04',
      dataNova: '2026-11-02',
      usuarioId: 'u1',
    });
    expect(lactacao.inicio).toBe('2026-11-02');
    expect(anterior.fim).toBe('2026-11-01');
  });

  it('saidaDoRebanho encerra a lactação aberta com SAIDA', async () => {
    const aberta = { id: 'l1', fim: null, motivoFim: null };
    responder(Lactacao, aberta);
    await ganchos.aoSairDoRebanho(m, {
      fazendaId: 'f1',
      animalId: 'v1',
      data: '2026-11-04',
      usuarioId: 'u1',
    });
    expect(aberta).toMatchObject({ fim: '2026-11-04', motivoFim: MotivoFimLactacao.SAIDA });
  });

  describe('tratamentoGravado (carência)', () => {
    const tratamento = {
      fazendaId: 'f1',
      animalId: 'v1',
      tratamentoId: 't1',
      produto: 'antibiotico x',
      data: '2026-11-04',
      usuarioId: 'u1',
      novo: true,
    };
    const produto = { id: 'pr1', nome: 'Antibiótico X', carenciaLeiteDias: 4 };

    beforeEach(() => {
      responder(Animal, vaca());
    });

    it('produto sem cadastro → 422 PRODUTO_SEM_CADASTRO', async () => {
      manager.find.mockResolvedValue([]);
      const erro = await ganchos.aoGravarTratamento(m, tratamento).catch((e: unknown) => e);
      expect(erro).toBeInstanceOf(UnprocessableEntityException);
      expect((erro as UnprocessableEntityException).getResponse()).toMatchObject({
        codigo: 'PRODUTO_SEM_CADASTRO',
        produto: 'antibiotico x',
      });
    });

    it('produto com carência grava o prazo copiado (nome comparado sem acento)', async () => {
      manager.find.mockImplementation(async (entidade: unknown) =>
        entidade === ProdutoLeite ? [produto] : [],
      );
      await ganchos.aoGravarTratamento(m, tratamento);
      expect(manager.create).toHaveBeenCalledWith(CarenciaLeite, {
        fazendaId: 'f1',
        animalId: 'v1',
        tratamentoId: 't1',
        produtoId: 'pr1',
        data: '2026-11-04',
        carenciaDias: 4,
        dataFim: '2026-11-08',
      });
    });

    it('carência 0 não grava prazo', async () => {
      manager.find.mockImplementation(async (entidade: unknown) =>
        entidade === ProdutoLeite ? [{ ...produto, carenciaLeiteDias: 0 }] : [],
      );
      await ganchos.aoGravarTratamento(m, tratamento);
      expect(manager.create).not.toHaveBeenCalled();
    });

    it('correção da data troca o prazo e recalcula o descarte das ordenhas do intervalo', async () => {
      const anterior = { id: 'c1', produtoId: 'pr1', data: '2026-11-04', dataFim: '2026-11-08' };
      responder(CarenciaLeite, anterior);
      const ordenhas = [
        { id: 'o1', data: '2026-11-03', descarte: false },
        { id: 'o2', data: '2026-11-07', descarte: true },
        { id: 'o3', data: '2026-11-20', descarte: false },
      ];
      manager.find.mockImplementation(async (entidade: unknown) => {
        if (entidade === ProdutoLeite) return [produto];
        if (entidade === Ordenha) return ordenhas;
        // Carências depois da troca: 02 a 06
        if (entidade === CarenciaLeite) return [{ data: '2026-11-02', dataFim: '2026-11-06' }];
        return [];
      });
      await ganchos.aoGravarTratamento(m, { ...tratamento, novo: false, data: '2026-11-02' });
      expect(manager.delete).toHaveBeenCalledWith(CarenciaLeite, { id: 'c1' });
      expect(manager.update).toHaveBeenCalledWith(Ordenha, { id: 'o1' }, { descarte: true });
      expect(manager.update).toHaveBeenCalledWith(Ordenha, { id: 'o2' }, { descarte: false });
      expect(manager.update).not.toHaveBeenCalledWith(Ordenha, { id: 'o3' }, expect.anything());
    });

    it('correção de tratamento antigo sem carência e sem cadastro: nada', async () => {
      await expect(
        ganchos.aoGravarTratamento(m, { ...tratamento, novo: false }),
      ).resolves.toBeUndefined();
    });

    it('macho, ou Leite não ativo: nada', async () => {
      porEntidade.set(Animal, [vaca({ sexo: Sexo.M })]);
      await ganchos.aoGravarTratamento(m, tratamento);
      acesso.situacao.mockResolvedValue('SO_CONSULTA');
      await ganchos.aoGravarTratamento(m, tratamento);
      expect(manager.find).not.toHaveBeenCalled();
    });
  });
});
