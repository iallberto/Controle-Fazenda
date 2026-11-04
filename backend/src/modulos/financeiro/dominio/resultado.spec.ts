import {
  mesesDoPeriodo,
  normalizarPeriodo,
  percentuaisPorCategoria,
  resultadoMensal,
  resumoVendas,
} from './resultado';

describe('resultado (FR-017 a FR-019)', () => {
  it('meses do período, virando o ano', () => {
    expect(mesesDoPeriodo('2025-11', '2026-02')).toEqual([
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
    ]);
  });

  it('período padrão de 12 meses e limite de 36', () => {
    expect(normalizarPeriodo('2026-11')).toEqual({
      de: '2025-12',
      ate: '2026-11',
    });
    expect(normalizarPeriodo('2026-11', '2020-01', '2026-11')).toEqual({
      de: '2023-12',
      ate: '2026-11',
    });
    expect(normalizarPeriodo('2026-11', '2026-12', '2026-11').de).toBe(
      '2026-11',
    );
  });

  it('lucro de cada mês e do período, com meses vazios', () => {
    const r = resultadoMensal(
      ['2026-09', '2026-10', '2026-11'],
      [
        { mes: '2026-09', tipo: 'RECEITA', totalCentavos: 900000 },
        { mes: '2026-09', tipo: 'DESPESA', totalCentavos: 125000 },
        { mes: '2026-11', tipo: 'DESPESA', totalCentavos: 50000 },
      ],
    );
    expect(r.meses).toEqual([
      {
        mes: '2026-09',
        receitaCentavos: 900000,
        despesaCentavos: 125000,
        lucroCentavos: 775000,
      },
      {
        mes: '2026-10',
        receitaCentavos: 0,
        despesaCentavos: 0,
        lucroCentavos: 0,
      },
      {
        mes: '2026-11',
        receitaCentavos: 0,
        despesaCentavos: 50000,
        lucroCentavos: -50000,
      },
    ]);
    expect(r.totais).toEqual({
      receitaCentavos: 900000,
      despesaCentavos: 175000,
      lucroCentavos: 725000,
    });
  });

  it('percentuais por categoria do maior ao menor, somando 100', () => {
    const r = percentuaisPorCategoria([
      { categoria: 'Mão de obra', valorCentavos: 100 },
      { categoria: 'Ração', valorCentavos: 100 },
      { categoria: 'Diesel', valorCentavos: 100 },
    ]);
    expect(r.reduce((a, l) => a + l.percentual * 10, 0)).toBe(1000);
    expect(r.map((l) => l.percentual).sort((a, b) => a - b)).toEqual([
      33.3, 33.3, 33.4,
    ]);

    const ordem = percentuaisPorCategoria([
      { categoria: 'A', valorCentavos: 25 },
      { categoria: 'B', valorCentavos: 75 },
    ]);
    expect(ordem).toEqual([
      { categoria: 'B', valorCentavos: 75, percentual: 75 },
      { categoria: 'A', valorCentavos: 25, percentual: 25 },
    ]);
    expect(percentuaisPorCategoria([])).toEqual([]);
  });

  it('vendas: total, por categoria e preço médio da arroba por mês', () => {
    const r = resumoVendas(
      ['2026-10', '2026-11'],
      [
        {
          mes: '2026-10',
          categoria: 'GARROTE',
          arrobas: 30,
          valorCentavos: 900000,
        },
        {
          mes: '2026-10',
          categoria: 'GARROTE',
          arrobas: 20,
          valorCentavos: 640000,
        },
        {
          mes: '2026-11',
          categoria: 'MATRIZ',
          arrobas: null,
          valorCentavos: 500000,
        },
      ],
    );
    expect(r.totalCentavos).toBe(2040000);
    expect(r.animais).toBe(3);
    expect(r.porCategoria).toEqual([
      { categoria: 'GARROTE', animais: 2, valorCentavos: 1540000 },
      { categoria: 'MATRIZ', animais: 1, valorCentavos: 500000 },
    ]);
    expect(r.arrobaPorMes).toEqual([
      { mes: '2026-10', precoMedioArrobaCentavos: 30800, arrobas: 50 },
      { mes: '2026-11', precoMedioArrobaCentavos: null, arrobas: 0 },
    ]);
  });
});
