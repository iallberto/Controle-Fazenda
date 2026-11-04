import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsosService, formatarQuantidade } from './usos.service';
import { RegistroUso, SituacaoUso } from './entities/registro-uso.entity';
import { TipoLancamento } from './entities/categoria-financeira.entity';
import { OrigemLancamento } from './entities/lancamento.entity';

describe('UsosService (US4, FR-022 a FR-025)', () => {
  const manager = { update: jest.fn() };
  const repo = {
    find: jest.fn(),
    findOneBy: jest.fn(),
    countBy: jest.fn(),
    create: jest.fn((dados: object) => dados),
    save: jest.fn(async (dados: object) => ({ id: 'u1', ...dados })),
    update: jest.fn(),
    manager: { transaction: jest.fn() },
  };
  const categorias = { validarParaLancar: jest.fn(), listar: jest.fn() };
  const lancamentos = {
    validarAnimalOuPasto: jest.fn(),
    lancarNaTransacao: jest.fn(async () => ({ id: 'l1' })),
  };
  const service = new UsosService(
    repo as never,
    categorias as never,
    lancamentos as never,
  );

  const registro = {
    id: 'u1',
    fazendaId: 'f1',
    data: '2026-11-04',
    item: 'Diesel',
    quantidade: '40.00',
    unidade: 'litros',
    categoriaId: 'c-comb',
    animalId: null,
    pastoId: 'p1',
    situacao: SituacaoUso.AGUARDANDO,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repo.manager.transaction.mockImplementation(
      (cb: (m: typeof manager) => unknown) => cb(manager),
    );
    repo.findOneBy.mockResolvedValue({ ...registro });
  });

  it('formata a quantidade sem zeros sobrando', () => {
    expect(formatarQuantidade('40.00')).toBe('40');
    expect(formatarQuantidade('2.50')).toBe('2,5');
  });

  it('registra com categoria de despesa e animal ou pasto da fazenda', async () => {
    const r = await service.registrar('f1', 'func', {
      data: '2026-11-04',
      item: 'Diesel',
      quantidade: 40,
      unidade: 'litros',
      categoriaId: 'c-comb',
      pastoId: 'p1',
    });
    expect(categorias.validarParaLancar).toHaveBeenCalledWith(
      'f1',
      'c-comb',
      TipoLancamento.DESPESA,
    );
    expect(lancamentos.validarAnimalOuPasto).toHaveBeenCalledWith(
      'f1',
      undefined,
      'p1',
    );
    expect(r).toEqual({ id: 'u1', situacao: SituacaoUso.AGUARDANDO });
  });

  it('a lista não leva nenhum campo de valor (SC-006)', async () => {
    repo.find.mockResolvedValue([
      {
        ...registro,
        lancamentoId: 'l1',
        situacao: SituacaoUso.LANCADO,
        categoria: { nome: 'Combustível e energia' },
        criadoPor: { nome: 'Peão' },
        motivoDescarte: null,
      },
    ]);
    const [item] = await service.listar('f1');
    expect(Object.keys(item).sort()).toEqual(
      [
        'animal',
        'categoria',
        'data',
        'id',
        'item',
        'motivoDescarte',
        'pasto',
        'quantidade',
        'registradoPor',
        'situacao',
        'unidade',
      ].sort(),
    );
    expect(JSON.stringify(item)).not.toMatch(/valor|lancamento/i);
  });

  it('valorar lança a despesa com item e quantidade e marca como lançado', async () => {
    await service.valorar('f1', 'dono', 'u1', 28000);
    expect(lancamentos.lancarNaTransacao).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        tipo: TipoLancamento.DESPESA,
        valorCentavos: 28000,
        categoriaId: 'c-comb',
        descricao: 'Diesel — 40 litros',
        origem: OrigemLancamento.USO,
        pastoId: 'p1',
        registroUsoId: 'u1',
      }),
    );
    expect(manager.update).toHaveBeenCalledWith(
      RegistroUso,
      { id: 'u1' },
      expect.objectContaining({
        situacao: SituacaoUso.LANCADO,
        lancamentoId: 'l1',
      }),
    );
  });

  it('descartar grava o motivo', async () => {
    await service.descartar('f1', 'dono', 'u1', ' doação do vizinho ');
    expect(repo.update).toHaveBeenCalledWith(
      { id: 'u1' },
      expect.objectContaining({
        situacao: SituacaoUso.DESCARTADO,
        motivoDescarte: 'doação do vizinho',
      }),
    );
  });

  it('só registro aguardando é valorado ou descartado; outra fazenda: 404', async () => {
    repo.findOneBy.mockResolvedValue({
      ...registro,
      situacao: SituacaoUso.LANCADO,
    });
    await expect(service.valorar('f1', 'dono', 'u1', 100)).rejects.toThrow(
      BadRequestException,
    );
    repo.findOneBy.mockResolvedValue({ ...registro, fazendaId: 'f2' });
    await expect(service.descartar('f1', 'dono', 'u1', 'x')).rejects.toThrow(
      NotFoundException,
    );
  });
});
