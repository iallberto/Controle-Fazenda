import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LancamentosService, limitesDoMes } from './lancamentos.service';
import { TipoLancamento } from './entities/categoria-financeira.entity';
import { OrigemLancamento } from './entities/lancamento.entity';

describe('LancamentosService (US1, FR-004, FR-007, FR-008)', () => {
  const repo = {
    find: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn((dados: object) => dados),
    save: jest.fn(async (dados: object) => ({ id: 'l-novo', ...dados })),
    update: jest.fn(),
  };
  const animalRepo = { findOneBy: jest.fn() };
  const pastoRepo = { findOneBy: jest.fn() };
  const categorias = { validarParaLancar: jest.fn() };
  const service = new LancamentosService(
    repo as never,
    animalRepo as never,
    pastoRepo as never,
    categorias as never,
  );

  const ativo = { cancelado: false, motivoCancelamento: null };
  const lanc = (tipo: TipoLancamento, valor: number, cancelado = false) => ({
    id: `l-${valor}`,
    fazendaId: 'f1',
    tipo,
    data: '2026-11-03',
    valorCentavos: valor,
    categoria: { id: 'c1', nome: 'X' },
    descricao: 'x',
    origem: OrigemLancamento.MANUAL,
    vendaId: null,
    cancelamento: { ...ativo, cancelado },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    categorias.validarParaLancar.mockResolvedValue({});
  });

  it('limitesDoMes acerta fevereiro e meses de 30 e 31 dias', () => {
    expect(limitesDoMes('2026-02')).toEqual(['2026-02-01', '2026-02-28']);
    expect(limitesDoMes('2028-02')).toEqual(['2028-02-01', '2028-02-29']);
    expect(limitesDoMes('2026-11')).toEqual(['2026-11-01', '2026-11-30']);
  });

  it('totais do mês sem os cancelados', async () => {
    repo.find.mockResolvedValue([
      lanc(TipoLancamento.RECEITA, 900000),
      lanc(TipoLancamento.DESPESA, 125000),
      lanc(TipoLancamento.DESPESA, 50000, true),
    ]);
    const r = await service.listarMes('f1', { mes: '2026-11' });
    expect(r).toMatchObject({
      receitaCentavos: 900000,
      despesaCentavos: 125000,
      saldoCentavos: 775000,
    });
    expect(r.lancamentos).toHaveLength(3);
  });

  it('filtra por origem e devolve o caminho do registro de origem (spec 006, FR-011)', async () => {
    repo.find.mockResolvedValue([
      {
        ...lanc(TipoLancamento.RECEITA, 902460),
        origem: OrigemLancamento.LEITE,
        origemCaminho: '/modulos/leite/entregas?mes=2026-10',
      },
    ]);
    const r = await service.listarMes('f1', { mes: '2026-11', origem: OrigemLancamento.LEITE });
    expect(repo.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ origem: OrigemLancamento.LEITE }) }),
    );
    expect(r.lancamentos[0]).toMatchObject({
      origem: 'LEITE',
      origemCaminho: '/modulos/leite/entregas?mes=2026-10',
    });
  });

  const dto = {
    tipo: TipoLancamento.DESPESA,
    data: '2026-11-03',
    valorCentavos: 125000,
    categoriaId: 'c1',
    descricao: 'Ração',
  };

  it('cria lançamento manual validando a categoria pelo tipo', async () => {
    const novo = await service.criar('f1', 'dono', dto);
    expect(categorias.validarParaLancar).toHaveBeenCalledWith(
      'f1',
      'c1',
      TipoLancamento.DESPESA,
    );
    expect(novo).toMatchObject({
      origem: OrigemLancamento.MANUAL,
      criadoPorId: 'dono',
      animalId: null,
      pastoId: null,
    });
  });

  it('animal e pasto juntos: 400; animal de outra fazenda: 404', async () => {
    await expect(
      service.criar('f1', 'dono', { ...dto, animalId: 'a1', pastoId: 'p1' }),
    ).rejects.toThrow(BadRequestException);
    animalRepo.findOneBy.mockResolvedValue({ id: 'a1', fazendaId: 'f2' });
    await expect(
      service.criar('f1', 'dono', { ...dto, animalId: 'a1' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('cancela lançamento manual com motivo', async () => {
    repo.findOneBy.mockResolvedValue(lanc(TipoLancamento.DESPESA, 100));
    await service.cancelar('f1', 'dono', 'l-100', ' engano ');
    expect(repo.update).toHaveBeenCalledWith(
      { id: 'l-100' },
      expect.objectContaining({
        cancelamento: expect.objectContaining({
          cancelado: true,
          motivoCancelamento: 'engano',
        }),
      }),
    );
  });

  it('lançamento de venda não é editado nem cancelado por aqui', async () => {
    repo.findOneBy.mockResolvedValue({
      ...lanc(TipoLancamento.RECEITA, 900000),
      origem: OrigemLancamento.VENDA,
    });
    await expect(
      service.cancelar('f1', 'dono', 'l-900000', 'x'),
    ).rejects.toThrow('cancele a venda');
    await expect(
      service.editar('f1', 'dono', 'l-900000', { valorCentavos: 1 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('cancelado não edita; outra fazenda: 404', async () => {
    repo.findOneBy.mockResolvedValue(lanc(TipoLancamento.DESPESA, 100, true));
    await expect(
      service.editar('f1', 'dono', 'l-100', { descricao: 'y' }),
    ).rejects.toThrow('já foi cancelado');
    repo.findOneBy.mockResolvedValue({
      ...lanc(TipoLancamento.DESPESA, 100),
      fazendaId: 'f2',
    });
    await expect(
      service.editar('f1', 'dono', 'l-100', { descricao: 'y' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('trocar a categoria valida pelo tipo do lançamento', async () => {
    repo.findOneBy.mockResolvedValue(lanc(TipoLancamento.DESPESA, 100));
    await service.editar('f1', 'dono', 'l-100', { categoriaId: 'c9' });
    expect(categorias.validarParaLancar).toHaveBeenCalledWith(
      'f1',
      'c9',
      TipoLancamento.DESPESA,
    );
  });
});
