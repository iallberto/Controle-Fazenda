import { ganchosModulos } from '../../common/ganchos-modulos';
import { CodigoCategoria, TipoLancamento } from './entities/categoria-financeira.entity';
import { CategoriaFinanceira } from './entities/categoria-financeira.entity';
import { Lancamento, OrigemLancamento } from './entities/lancamento.entity';
import { GanchosFinanceiro } from './ganchos-financeiro';

describe('GanchosFinanceiro (spec 006, R1, R2, R4)', () => {
  const situacoes: Record<string, string> = {};
  const acesso = { situacao: jest.fn(async (_f: string, m: string) => situacoes[m]) };
  const padrao: Record<string, { id: string }> = {
    [CodigoCategoria.VENDA_LEITE]: { id: 'cat-leite' },
    [CodigoCategoria.RACAO_SAL]: { id: 'cat-racao' },
    [CodigoCategoria.OUTRAS_DESPESAS]: { id: 'cat-outras' },
  };
  const categorias = { porCodigo: jest.fn(async (_m: unknown, c: string) => padrao[c]) };
  const lancamentos = { lancarNaTransacao: jest.fn() };
  const manager = { findOne: jest.fn(), find: jest.fn(), save: jest.fn() };
  const ganchos = new GanchosFinanceiro(acesso as never, categorias as never, lancamentos as never);
  const m = manager as never;

  beforeEach(() => {
    jest.clearAllMocks();
    ganchosModulos.limpar();
    Object.assign(situacoes, { FINANCEIRO: 'ATIVO', LEITE: 'ATIVO', NUTRICAO: 'ATIVO' });
  });

  const recebido = {
    fazendaId: 'f1',
    recebimentoId: 'r1',
    mes: '2026-10',
    data: '2026-11-10',
    litros: 3471,
    valorCentavos: 902460,
    caminho: '/modulos/leite/entregas?mes=2026-10',
    usuarioId: 'u1',
  };

  it('leiteRecebido lança a receita em Venda de leite com a origem e o link', async () => {
    ganchos.onModuleInit();
    await ganchosModulos.emitir('leiteRecebido', m, recebido);
    expect(lancamentos.lancarNaTransacao).toHaveBeenCalledWith(manager, {
      fazendaId: 'f1',
      usuarioId: 'u1',
      tipo: TipoLancamento.RECEITA,
      data: '2026-11-10',
      valorCentavos: 902460,
      categoriaId: 'cat-leite',
      descricao: 'Leite de 10/2026 — 3.471 L',
      origem: OrigemLancamento.LEITE,
      origemId: 'r1',
      origemCaminho: '/modulos/leite/entregas?mes=2026-10',
    });
  });

  it.each([
    ['FINANCEIRO', 'SO_CONSULTA'],
    ['FINANCEIRO', 'NAO_CONTRATADO'],
    ['LEITE', 'SO_CONSULTA'],
  ])('com %s %s nada é lançado (FR-001)', async (modulo, situacao) => {
    situacoes[modulo] = situacao;
    await ganchos.aoReceberLeite(m, recebido);
    expect(lancamentos.lancarNaTransacao).not.toHaveBeenCalled();
  });

  describe('compra da Nutrição', () => {
    const compra = {
      fazendaId: 'f1',
      entradaId: 'e1',
      tipoInsumo: 'RACAO',
      categoriaId: null as string | null,
      data: '2026-11-04',
      descricao: 'Ração — 40 saco',
      valorCentavos: 320000,
      caminho: '/modulos/nutricao/insumos/i1',
      usuarioId: 'u1',
    };

    it('sem categoria escolhida: padrão pelo tipo (ração → Ração e sal; outro → Outras despesas)', async () => {
      await ganchos.aoValorarCompra(m, compra);
      expect(lancamentos.lancarNaTransacao).toHaveBeenLastCalledWith(
        manager,
        expect.objectContaining({ categoriaId: 'cat-racao', tipo: TipoLancamento.DESPESA, origem: OrigemLancamento.NUTRICAO, origemId: 'e1' }),
      );
      await ganchos.aoValorarCompra(m, { ...compra, tipoInsumo: 'OUTRO' });
      expect(lancamentos.lancarNaTransacao).toHaveBeenLastCalledWith(manager, expect.objectContaining({ categoriaId: 'cat-outras' }));
    });

    it('categoria escolhida vale se for de despesa, ativa e da fazenda; senão o padrão', async () => {
      manager.findOne.mockResolvedValueOnce({ id: 'cat-diesel', tipo: TipoLancamento.DESPESA, ativa: true, fazendaId: 'f1' });
      await ganchos.aoValorarCompra(m, { ...compra, categoriaId: 'cat-diesel' });
      expect(lancamentos.lancarNaTransacao).toHaveBeenLastCalledWith(manager, expect.objectContaining({ categoriaId: 'cat-diesel' }));
      manager.findOne.mockResolvedValueOnce({ id: 'x', tipo: TipoLancamento.DESPESA, ativa: false, fazendaId: 'f1' });
      await ganchos.aoValorarCompra(m, { ...compra, categoriaId: 'x' });
      expect(lancamentos.lancarNaTransacao).toHaveBeenLastCalledWith(manager, expect.objectContaining({ categoriaId: 'cat-racao' }));
      manager.findOne.mockResolvedValueOnce({ id: 'y', tipo: TipoLancamento.DESPESA, ativa: true, fazendaId: 'f2' });
      await ganchos.aoValorarCompra(m, { ...compra, categoriaId: 'y' });
      expect(lancamentos.lancarNaTransacao).toHaveBeenLastCalledWith(manager, expect.objectContaining({ categoriaId: 'cat-racao' }));
      expect(manager.findOne).toHaveBeenCalledWith(CategoriaFinanceira, { where: { id: 'y' } });
    });

    it('Nutrição desativada ou valor zero: nada', async () => {
      situacoes.NUTRICAO = 'SO_CONSULTA';
      await ganchos.aoValorarCompra(m, compra);
      situacoes.NUTRICAO = 'ATIVO';
      await ganchos.aoValorarCompra(m, { ...compra, valorCentavos: 0 });
      expect(lancamentos.lancarNaTransacao).not.toHaveBeenCalled();
    });
  });

  it('desfazer na origem cancela o lançamento gerado, com o motivo', async () => {
    const lancamento = { id: 'l1', cancelamento: { cancelado: false } };
    manager.find.mockResolvedValue([lancamento]);
    await ganchos.cancelarDaOrigem(m, OrigemLancamento.LEITE, 'r1', 'f1', 'Valor errado', 'u1');
    expect(manager.find).toHaveBeenCalledWith(Lancamento, {
      where: { fazendaId: 'f1', origem: OrigemLancamento.LEITE, origemId: 'r1', cancelamento: { cancelado: false } },
    });
    expect(lancamento.cancelamento).toMatchObject({ cancelado: true, motivoCancelamento: 'Valor errado' });
    manager.find.mockResolvedValue([]);
    await ganchos.cancelarDaOrigem(m, OrigemLancamento.NUTRICAO, 'e9', 'f1', 'x', 'u1');
    expect(manager.save).toHaveBeenCalledTimes(1);
  });
});
