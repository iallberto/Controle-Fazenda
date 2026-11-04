import { calcularPrevisaoParto, GESTACAO_PADRAO_DIAS } from './previsao-parto';

describe('previsão de parto (FR-018)', () => {
  const diagnostico = { data: '2026-11-03', idadeGestacionalDias: null };

  it('com inseminação antes do diagnóstico, usa a data dela + gestação da raça', () => {
    const previsao = calcularPrevisaoParto({
      diagnostico,
      inseminacoes: [{ data: '2026-08-01' }, { data: '2026-07-01' }],
      exposicoes: [],
      gestacaoMediaDias: 291,
    });
    // 01/08 + 291 dias
    expect(previsao).toEqual({ data: '2027-05-19', base: 'INSEMINACAO' });
  });

  it('ignora inseminação feita depois do diagnóstico', () => {
    const previsao = calcularPrevisaoParto({
      diagnostico,
      inseminacoes: [{ data: '2026-12-01' }],
      exposicoes: [],
      gestacaoMediaDias: 291,
    });
    expect(previsao).toBeNull();
  });

  it('com idade gestacional do toque, usa diagnóstico − idade + gestação', () => {
    const previsao = calcularPrevisaoParto({
      diagnostico: { data: '2026-11-03', idadeGestacionalDias: 112 },
      inseminacoes: [],
      exposicoes: [{ dataInicio: '2026-06-01', dataFim: '2026-09-01' }],
      gestacaoMediaDias: 291,
    });
    // concepção 14/07/2026 + 291 = 01/05/2027
    expect(previsao).toEqual({ data: '2027-05-01', base: 'TOQUE' });
  });

  it('sem idade, usa o meio do período de exposição + gestação', () => {
    const previsao = calcularPrevisaoParto({
      diagnostico,
      inseminacoes: [],
      exposicoes: [{ dataInicio: '2026-06-01', dataFim: '2026-07-31' }],
      gestacaoMediaDias: 291,
    });
    // meio entre 01/06 e 31/07 = 01/07 (60 dias / 2 = 30); + 291 = 18/04/2027
    expect(previsao).toEqual({ data: '2027-04-18', base: 'ESTACAO' });
  });

  it('junta exposições a touros diferentes e termina as abertas no diagnóstico', () => {
    const previsao = calcularPrevisaoParto({
      diagnostico: { data: '2026-08-30', idadeGestacionalDias: null },
      inseminacoes: [],
      exposicoes: [
        { dataInicio: '2026-07-01', dataFim: '2026-07-31' },
        { dataInicio: '2026-07-20', dataFim: null },
      ],
      gestacaoMediaDias: 291,
    });
    // união 01/07 → 30/08 (60 dias), meio 31/07; + 291 = 18/05/2027
    expect(previsao).toEqual({ data: '2027-05-18', base: 'ESTACAO' });
  });

  it('ignora exposição que começou depois do diagnóstico', () => {
    const previsao = calcularPrevisaoParto({
      diagnostico,
      inseminacoes: [],
      exposicoes: [{ dataInicio: '2026-12-01', dataFim: null }],
      gestacaoMediaDias: 291,
    });
    expect(previsao).toBeNull();
  });

  it('raça sem gestação cadastrada usa 285 dias', () => {
    const previsao = calcularPrevisaoParto({
      diagnostico: { data: '2026-11-03', idadeGestacionalDias: 100 },
      inseminacoes: [],
      exposicoes: [],
      gestacaoMediaDias: null,
    });
    expect(GESTACAO_PADRAO_DIAS).toBe(285);
    // concepção 26/07/2026 + 285 = 07/05/2027
    expect(previsao).toEqual({ data: '2027-05-07', base: 'TOQUE' });
  });
});
