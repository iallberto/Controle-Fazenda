import { calcularVenda, precoMedioArroba } from './calculo-venda';

describe('calcularVenda (research R5)', () => {
  it('por arroba: 450 kg a 15 kg/@ e R$ 300,00 dá 30 @ e R$ 9.000,00', () => {
    const r = calcularVenda({
      forma: 'POR_ARROBA',
      precoArrobaCentavos: 30000,
      itens: [{ pesoKg: 450, kgPorArroba: 15 }],
    });
    expect(r).toEqual({
      itens: [{ arrobas: 30, valorCentavos: 900000 }],
      arrobasTotal: 30,
      valorTotalCentavos: 900000,
    });
  });

  it('lote com pesos diferentes soma as arrobas de cada animal', () => {
    const r = calcularVenda({
      forma: 'POR_ARROBA',
      precoArrobaCentavos: 31050,
      itens: [
        { pesoKg: 452.5, kgPorArroba: 15 },
        { pesoKg: 380, kgPorArroba: 15 },
        { pesoKg: 510, kgPorArroba: 16.5 },
      ],
    });
    // 30,17 @ · 25,33 @ · 30,91 @ (duas casas)
    expect(r.itens.map((i) => i.arrobas)).toEqual([30.17, 25.33, 30.91]);
    expect(r.itens.map((i) => i.valorCentavos)).toEqual([
      936779, 786497, 959756,
    ]);
    expect(r.valorTotalCentavos).toBe(936779 + 786497 + 959756);
    expect(r.arrobasTotal).toBe(86.41);
  });

  it('categoria sem peso de referência usa 15 kg', () => {
    const r = calcularVenda({
      forma: 'POR_ARROBA',
      precoArrobaCentavos: 30000,
      itens: [{ pesoKg: 300, kgPorArroba: null }],
    });
    expect(r.itens[0].arrobas).toBe(20);
  });

  it('por arroba sem peso em algum animal: erro', () => {
    expect(() =>
      calcularVenda({
        forma: 'POR_ARROBA',
        precoArrobaCentavos: 30000,
        itens: [{ pesoKg: null, kgPorArroba: 15 }],
      }),
    ).toThrow('peso');
  });

  it('valor total dividido pelo peso, com a soma exata do total', () => {
    const r = calcularVenda({
      forma: 'VALOR_TOTAL',
      valorTotalCentavos: 1000000,
      itens: [
        { pesoKg: 200, kgPorArroba: 15 },
        { pesoKg: 200, kgPorArroba: 15 },
        { pesoKg: 200, kgPorArroba: 15 },
      ],
    });
    // 333333 · 333333 · 333334 (a sobra vai para o último)
    expect(r.itens.map((i) => i.valorCentavos)).toEqual([
      333333, 333333, 333334,
    ]);
    expect(r.valorTotalCentavos).toBe(1000000);
    expect(r.itens.map((i) => i.arrobas)).toEqual([13.33, 13.33, 13.33]);
  });

  it('valor total sem peso em algum animal divide em partes iguais', () => {
    const r = calcularVenda({
      forma: 'VALOR_TOTAL',
      valorTotalCentavos: 1000001,
      itens: [
        { pesoKg: 300, kgPorArroba: 15 },
        { pesoKg: null, kgPorArroba: 15 },
      ],
    });
    expect(r.itens.map((i) => i.valorCentavos)).toEqual([500000, 500001]);
    expect(r.itens[1].arrobas).toBeNull();
    expect(r.arrobasTotal).toBe(20);
  });

  it('lote vazio, preço ou total ≤ 0: erro', () => {
    expect(() =>
      calcularVenda({
        forma: 'VALOR_TOTAL',
        valorTotalCentavos: 100,
        itens: [],
      }),
    ).toThrow();
    expect(() =>
      calcularVenda({
        forma: 'POR_ARROBA',
        precoArrobaCentavos: 0,
        itens: [{ pesoKg: 300, kgPorArroba: 15 }],
      }),
    ).toThrow();
    expect(() =>
      calcularVenda({
        forma: 'VALOR_TOTAL',
        valorTotalCentavos: 0,
        itens: [{ pesoKg: 300, kgPorArroba: 15 }],
      }),
    ).toThrow();
  });
});

describe('precoMedioArroba', () => {
  it('soma dos valores dividida pela soma das arrobas, só itens com peso', () => {
    expect(
      precoMedioArroba([
        { arrobas: 30, valorCentavos: 900000 },
        { arrobas: 20, valorCentavos: 640000 },
        { arrobas: null, valorCentavos: 500000 },
      ]),
    ).toBe(30800);
  });

  it('sem arrobas: null', () => {
    expect(
      precoMedioArroba([{ arrobas: null, valorCentavos: 100 }]),
    ).toBeNull();
  });
});
