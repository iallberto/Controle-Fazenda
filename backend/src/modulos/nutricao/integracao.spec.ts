import { ganchosModulos } from '../../common/ganchos-modulos';
import { Insumo, TipoInsumo, UnidadeBase, UnidadeInsumo } from './entities/insumo.entity';
import { MotivoMovimento, MovimentoInsumo } from './entities/movimento-insumo.entity';
import { MovimentosService } from './movimentos.service';
import { CustoService } from './custo.service';
import { managerFalso } from './manager-falso.helper-spec';

const HOJE = '2026-11-04';

describe('Nutrição avisa o Financeiro (spec 006, US2)', () => {
  let manager: ReturnType<typeof managerFalso>;
  let movimentos: MovimentosService;
  let custo: CustoService;
  const eventos: { evento: string; dados: Record<string, unknown> }[] = [];

  beforeEach(() => {
    manager = managerFalso();
    movimentos = new MovimentosService(manager as never);
    custo = new CustoService(manager as never);
    eventos.length = 0;
    ganchosModulos.limpar();
    ganchosModulos.registrar('nutricaoCompraValorada', async (_m, d) => {
      eventos.push({ evento: 'valorada', dados: d });
    });
    ganchosModulos.registrar('nutricaoEntradaCancelada', async (_m, d) => {
      eventos.push({ evento: 'cancelada', dados: d });
    });
    const unidades = [{ id: 'u-saco', nome: 'saco', fator: 25, ativa: true }];
    manager.dados.set(Insumo, [
      {
        id: 'i1',
        fazendaId: 'f1',
        nome: 'Ração 22%',
        tipo: TipoInsumo.RACAO,
        unidadeBase: UnidadeBase.KG,
        ativo: true,
        categoriaDespesaId: 'cat-x',
        unidades,
      },
    ]);
    manager.dados.set(UnidadeInsumo, unidades);
  });

  const entrada = {
    insumoId: 'i1',
    data: HOJE,
    quantidade: 40,
    unidadeId: 'u-saco',
    motivo: MotivoMovimento.COMPRA as const,
    fornecedor: 'Agro Teste',
  };

  it('compra com valor do dono avisa na transação, com categoria do insumo, descrição e caminho', async () => {
    await movimentos.entrada('f1', 'u1', 'DONO', { ...entrada, valorCentavos: 320000 }, HOJE);
    expect(manager.transaction).toHaveBeenCalled();
    expect(eventos).toEqual([
      {
        evento: 'valorada',
        dados: expect.objectContaining({
          fazendaId: 'f1',
          tipoInsumo: 'RACAO',
          categoriaId: 'cat-x',
          data: HOJE,
          descricao: 'Ração 22% — 40 saco (Agro Teste)',
          valorCentavos: 320000,
          caminho: '/modulos/nutricao/insumos/i1',
        }),
      },
    ]);
  });

  it('compra sem valor e produção própria com valor não avisam', async () => {
    await movimentos.entrada('f1', 'u1', 'FUNCIONARIO', entrada, HOJE);
    await movimentos.entrada('f1', 'u1', 'DONO', { ...entrada, motivo: MotivoMovimento.PRODUCAO, valorCentavos: 1000 }, HOJE);
    expect(eventos).toEqual([]);
  });

  it('informar o preço avisa; corrigir o preço cancela a despesa anterior e lança a nova', async () => {
    const aguardando = {
      id: 'e1',
      fazendaId: 'f1',
      insumoId: 'i1',
      unidadeId: 'u-saco',
      quantidade: 40,
      data: HOJE,
      tipo: 'ENTRADA',
      motivo: MotivoMovimento.COMPRA,
      valorCentavos: null as number | null,
      aguardandoPreco: true,
      fornecedor: null,
      cancelamento: { cancelado: false },
    };
    manager.dados.set(MovimentoInsumo, [aguardando]);
    await custo.informarPreco('f1', 'u1', 'e1', 320000);
    expect(eventos.map((e) => e.evento)).toEqual(['valorada']);
    await custo.informarPreco('f1', 'u1', 'e1', 330000);
    expect(eventos.map((e) => e.evento)).toEqual(['valorada', 'cancelada', 'valorada']);
    expect(eventos[2].dados).toMatchObject({ valorCentavos: 330000, entradaId: 'e1' });
  });

  it('cancelar entrada de compra avisa o cancelamento; baixa não', async () => {
    manager.dados.set(MovimentoInsumo, [
      { id: 'e1', fazendaId: 'f1', tipo: 'ENTRADA', motivo: MotivoMovimento.COMPRA, cancelamento: { cancelado: false } },
      { id: 'b1', fazendaId: 'f1', tipo: 'BAIXA', motivo: MotivoMovimento.PERDA, cancelamento: { cancelado: false } },
    ]);
    await movimentos.cancelar('f1', 'u1', 'e1', 'Lançada errada');
    await movimentos.cancelar('f1', 'u1', 'b1', 'x');
    expect(eventos).toEqual([
      { evento: 'cancelada', dados: { fazendaId: 'f1', entradaId: 'e1', motivo: 'Lançada errada', usuarioId: 'u1' } },
    ]);
  });
});
