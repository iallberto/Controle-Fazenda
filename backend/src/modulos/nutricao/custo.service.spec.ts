import { BadRequestException } from '@nestjs/common';
import { Fornecimento } from './entities/fornecimento.entity';
import { MotivoMovimento, MovimentoInsumo, TipoMovimento } from './entities/movimento-insumo.entity';
import { CustoService } from './custo.service';
import { managerFalso } from './manager-falso.helper-spec';

const HOJE = '2026-11-04';

describe('CustoService (spec 005, US4)', () => {
  let manager: ReturnType<typeof managerFalso>;
  let custo: CustoService;

  beforeEach(() => {
    manager = managerFalso();
    custo = new CustoService(manager as never);
  });

  it('informar preço: entrada de compra deixa de aguardar; abertura de silo → 400', async () => {
    const entrada = {
      id: 'e1',
      fazendaId: 'f1',
      tipo: TipoMovimento.ENTRADA,
      motivo: MotivoMovimento.COMPRA,
      aguardandoPreco: true,
      valorCentavos: null as number | null,
      cancelamento: { cancelado: false },
    };
    manager.dados.set(MovimentoInsumo, [entrada, { ...entrada, id: 'e2', motivo: MotivoMovimento.SILO }]);
    await custo.informarPreco('f1', 'u1', 'e1', 320000);
    expect(entrada).toMatchObject({ valorCentavos: 320000, aguardandoPreco: false });
    await expect(custo.informarPreco('f1', 'u1', 'e2', 1)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('custo por lote: custo médio na data, animais-dia e parte de cada insumo', async () => {
    // Ração: 1.000 kg por R$ 3.200,00 (R$ 3,20/kg) em 01/11; 500 kg por R$ 1.750,00 em 03/11
    manager.dados.set(MovimentoInsumo, [
      { insumoId: 'racao', tipo: 'ENTRADA', data: '2026-11-01', quantidadeBase: 1000, valorCentavos: 320000, cancelamento: { cancelado: false } },
      { insumoId: 'racao', tipo: 'ENTRADA', data: '2026-11-03', quantidadeBase: 500, valorCentavos: 175000, cancelamento: { cancelado: false } },
      { insumoId: 'sal', tipo: 'ENTRADA', data: '2026-11-01', quantidadeBase: 25, valorCentavos: 5000, cancelamento: { cancelado: false } },
    ]);
    const item = (insumoId: string, nome: string, base: number) => ({ insumoId, insumo: { nome }, quantidadeBase: base });
    manager.dados.set(Fornecimento, [
      { fazendaId: 'f1', loteId: 'l1', lote: { nome: 'Lactação' }, data: '2026-11-02', animais: 20, cancelamento: { cancelado: false },
        itens: [item('racao', 'Ração', 80), item('sal', 'Sal', 3)] },
      { fazendaId: 'f1', loteId: 'l1', lote: { nome: 'Lactação' }, data: '2026-11-03', animais: 20, cancelamento: { cancelado: false },
        itens: [item('racao', 'Ração', 80), item('silagem', 'Silagem', 500)] },
    ]);
    const r = await custo.custo('f1', { de: '2026-11-01', ate: '2026-11-04' }, HOJE);
    // Dia 02: 80 × 320 + 3 × 200 = 26.200; dia 03: 80 × 330 = 26.400 (silagem sem preço)
    expect(r.lotes).toEqual([
      expect.objectContaining({
        nome: 'Lactação',
        totalCentavos: 52600,
        animaisDia: 40,
        porAnimalDiaCentavos: 1315,
      }),
    ]);
    expect(r.lotes[0].insumos[0]).toMatchObject({ nome: 'Ração', base: 160, totalCentavos: 52000, percentual: 98.9 });
    expect(r.insumosSemPreco).toEqual(['Silagem']);
  });

  it('período padrão: do dia 1 do mês até hoje; início depois do fim → 400', async () => {
    const r = await custo.custo('f1', {}, HOJE);
    expect(r).toMatchObject({ de: '2026-11-01', ate: HOJE, lotes: [] });
    await expect(custo.custo('f1', { de: '2026-11-05', ate: HOJE }, HOJE)).rejects.toBeInstanceOf(BadRequestException);
  });
});
