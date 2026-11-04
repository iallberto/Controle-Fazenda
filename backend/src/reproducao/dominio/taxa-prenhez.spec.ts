import {
  calcularIntervalosPartos,
  calcularTaxaPrenhez,
  somarTaxas,
} from './taxa-prenhez';

const cobertura = (femeaId: string, inicio = '2026-01-10', saiu = false) => ({
  femeaId,
  inicio,
  saiu,
});

describe('calcularTaxaPrenhez (R12)', () => {
  it('40 expostas e 34 prenhes dão 85% (cenário da spec)', () => {
    const coberturas = Array.from({ length: 40 }, (_, i) => cobertura(`v${i}`));
    const diagnosticos = coberturas.map((c, i) => ({
      femeaId: c.femeaId,
      data: '2026-04-10',
      resultado: (i < 34 ? 'PRENHE' : 'VAZIA') as 'PRENHE' | 'VAZIA',
    }));
    const taxa = calcularTaxaPrenhez(coberturas, diagnosticos);
    expect(taxa).toMatchObject({ cobertas: 40, prenhes: 34, vazias: 6 });
    expect(taxa.taxa).toBeCloseTo(0.85);
  });

  it('vale o primeiro diagnóstico depois do início da cobertura', () => {
    const taxa = calcularTaxaPrenhez(
      [cobertura('v1')],
      [
        // diagnóstico anterior à cobertura não conta
        { femeaId: 'v1', data: '2025-12-01', resultado: 'PRENHE' },
        { femeaId: 'v1', data: '2026-03-01', resultado: 'VAZIA' },
        { femeaId: 'v1', data: '2026-05-01', resultado: 'PRENHE' },
      ],
    );
    expect(taxa).toMatchObject({ prenhes: 0, vazias: 1, taxa: 0 });
  });

  it('diagnóstico depois de 300 dias não se refere a esta cobertura', () => {
    const taxa = calcularTaxaPrenhez(
      [cobertura('v1', '2026-01-10')],
      [{ femeaId: 'v1', data: '2026-11-07', resultado: 'PRENHE' }],
    );
    expect(taxa).toMatchObject({ prenhes: 0, semDiagnostico: 1, taxa: null });
  });

  it('dois diagnósticos no mesmo dia: vale o primeiro da lista', () => {
    const taxa = calcularTaxaPrenhez(
      [cobertura('v1')],
      [
        { femeaId: 'v1', data: '2026-03-01', resultado: 'VAZIA' },
        { femeaId: 'v1', data: '2026-03-01', resultado: 'PRENHE' },
      ],
    );
    expect(taxa).toMatchObject({ prenhes: 0, vazias: 1 });
  });

  it('perda de gestação não é diagnóstico de cobertura', () => {
    const taxa = calcularTaxaPrenhez(
      [cobertura('v1')],
      [
        { femeaId: 'v1', data: '2026-02-01', resultado: 'PERDA' },
        { femeaId: 'v1', data: '2026-03-01', resultado: 'PRENHE' },
      ],
    );
    expect(taxa.prenhes).toBe(1);
  });

  it('sem diagnóstico e "saíram" ficam fora do denominador e contados à parte', () => {
    const taxa = calcularTaxaPrenhez(
      [cobertura('v1'), cobertura('v2'), cobertura('v3', undefined, true)],
      [{ femeaId: 'v1', data: '2026-03-01', resultado: 'PRENHE' }],
    );
    expect(taxa).toEqual({
      cobertas: 3,
      prenhes: 1,
      vazias: 0,
      semDiagnostico: 1,
      sairam: 1,
      taxa: 1,
    });
  });

  it('fêmea com duas coberturas no grupo conta uma vez, desde a primeira', () => {
    const taxa = calcularTaxaPrenhez(
      [cobertura('v1', '2026-02-01'), cobertura('v1', '2026-01-10')],
      [{ femeaId: 'v1', data: '2026-01-25', resultado: 'VAZIA' }],
    );
    expect(taxa).toMatchObject({ cobertas: 1, vazias: 1 });
  });

  it('somarTaxas junta estações do mesmo touro e recalcula a taxa', () => {
    const soma = somarTaxas([
      {
        cobertas: 4,
        prenhes: 3,
        vazias: 1,
        semDiagnostico: 0,
        sairam: 0,
        taxa: 0.75,
      },
      {
        cobertas: 3,
        prenhes: 1,
        vazias: 1,
        semDiagnostico: 1,
        sairam: 0,
        taxa: 0.5,
      },
    ]);
    expect(soma).toMatchObject({
      cobertas: 7,
      prenhes: 4,
      vazias: 2,
      semDiagnostico: 1,
    });
    expect(soma.taxa).toBeCloseTo(4 / 6);
  });
});

describe('calcularIntervalosPartos (FR-029)', () => {
  it('intervalo por matriz e média do rebanho; uma cria só não entra', () => {
    const resultado = calcularIntervalosPartos([
      { maeId: 'm1', data: '2024-01-01' },
      { maeId: 'm1', data: '2025-01-01' }, // 366 dias (2024 é bissexto)
      { maeId: 'm1', data: '2026-03-01' }, // 424 dias
      { maeId: 'm2', data: '2025-06-01' },
      { maeId: 'm2', data: '2026-06-01' }, // 365 dias
      { maeId: 'm3', data: '2026-01-01' },
    ]);
    expect(resultado.porMatriz).toEqual([
      { maeId: 'm1', partos: 3, ultimoIntervaloDias: 424, mediaDias: 395 },
      { maeId: 'm2', partos: 2, ultimoIntervaloDias: 365, mediaDias: 365 },
    ]);
    expect(resultado.mediaRebanhoDias).toBe(Math.round((366 + 424 + 365) / 3));
  });

  it('partos no mesmo dia contam como um', () => {
    const resultado = calcularIntervalosPartos([
      { maeId: 'm1', data: '2026-01-01' },
      { maeId: 'm1', data: '2026-01-01' },
    ]);
    expect(resultado).toEqual({ porMatriz: [], mediaRebanhoDias: null });
  });
});
