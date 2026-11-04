import { UnidadeBase } from '../entities/insumo.entity';
import {
  custoMedio,
  custoPorAnimalDia,
  daBase,
  noLoteNaData,
  normalizarNome,
  paraBase,
  previsaoSilo,
  situacaoEstoque,
  sugestao,
  unidadesPadrao,
} from './regras';

describe('regras da Nutrição (spec 005)', () => {
  it('paraBase e daBase: 40 sacos de 25 kg = 1.000 kg; 1.000 kg = 40 sacos', () => {
    expect(paraBase(40, 25)).toBe(1000);
    expect(paraBase(0.15, 1)).toBe(0.15);
    expect(paraBase(1.2345, 1000)).toBe(1234.5);
    expect(daBase(1000, 25)).toBe(40);
  });

  it('unidades padrão: kg e tonelada para KG; litro; unidade', () => {
    expect(unidadesPadrao(UnidadeBase.KG)).toEqual([
      { nome: 'kg', fator: 1 },
      { nome: 'tonelada', fator: 1000 },
    ]);
    expect(unidadesPadrao(UnidadeBase.LITRO)).toEqual([{ nome: 'litro', fator: 1 }]);
    expect(unidadesPadrao(UnidadeBase.UNIDADE)).toEqual([{ nome: 'unidade', fator: 1 }]);
  });

  it('situação do estoque: negativo, baixo, normal', () => {
    expect(situacaoEstoque(-1, 250)).toBe('NEGATIVO');
    expect(situacaoEstoque(0, 250)).toBe('BAIXO');
    expect(situacaoEstoque(249.9, 250)).toBe('BAIXO');
    expect(situacaoEstoque(250, 250)).toBe('NORMAL');
    expect(situacaoEstoque(0, null)).toBe('NORMAL');
  });

  it('no lote na data: entrada ≤ D e saída > D', () => {
    const m = { entrada: '2026-11-01', saida: '2026-11-04' };
    expect(noLoteNaData(m, '2026-10-31')).toBe(false);
    expect(noLoteNaData(m, '2026-11-01')).toBe(true);
    expect(noLoteNaData(m, '2026-11-03')).toBe(true);
    expect(noLoteNaData(m, '2026-11-04')).toBe(false);
    expect(noLoteNaData({ entrada: '2026-11-01', saida: null }, '2027-01-01')).toBe(true);
  });

  it('sugestão: 0,15 kg × 20 animais = 3 kg', () => {
    expect(sugestao(0.15, 20)).toBe(3);
    expect(sugestao(25, 20)).toBe(500);
  });

  it('custo médio: só entradas com valor até a data', () => {
    const entradas = [
      { data: '2026-11-01', quantidadeBase: 1000, valorCentavos: 320000 },
      { data: '2026-11-03', quantidadeBase: 500, valorCentavos: 175000 },
      { data: '2026-11-02', quantidadeBase: 999, valorCentavos: null },
    ];
    expect(custoMedio(entradas, '2026-11-02')).toBe(320);
    expect(custoMedio(entradas, '2026-11-04')).toBe(330);
    expect(custoMedio(entradas, '2026-10-31')).toBeNull();
  });

  it('previsão do silo: 300 t, 30 t em 10 dias → saldo 270 t, 3 t/dia, 90 dias', () => {
    const baixas = Array.from({ length: 10 }, (_, i) => ({
      data: `2026-10-${String(i + 1).padStart(2, '0')}`,
      quantidadeBase: 3000,
    }));
    expect(previsaoSilo(300000, baixas, '2026-10-10')).toEqual({
      consumidoKg: 30000,
      saldoKg: 270000,
      mediaKgDia: 3000,
      diasRestantes: 90,
      acabaEm: '2027-01-08',
    });
  });

  it('previsão do silo: média dos últimos 7 dias com baixa; sem baixa, sem previsão', () => {
    const baixas = [
      { data: '2026-10-01', quantidadeBase: 10000 },
      ...Array.from({ length: 7 }, (_, i) => ({ data: `2026-10-1${i}`, quantidadeBase: 2000 })),
      { data: '2026-10-12', quantidadeBase: 1000 },
    ];
    const r = previsaoSilo(100000, baixas, '2026-10-20');
    expect(r.mediaKgDia).toBe(Math.round(((6 * 2000 + 3000) / 7) * 1000) / 1000);
    expect(previsaoSilo(100000, [], '2026-10-20')).toMatchObject({ mediaKgDia: null, diasRestantes: null });
  });

  it('custo por animal-dia: dois tratos no mesmo dia contam um dia', () => {
    expect(
      custoPorAnimalDia([
        { data: '2026-11-01', animais: 20, custoCentavos: 10000 },
        { data: '2026-11-01', animais: 20, custoCentavos: 6000 },
        { data: '2026-11-02', animais: 19, custoCentavos: 15200 },
      ]),
    ).toEqual({ totalCentavos: 31200, animaisDia: 39, porAnimalDiaCentavos: 800 });
  });

  it('normalizarNome', () => {
    expect(normalizarNome(' Ração 22% ')).toBe('racao 22%');
  });
});
