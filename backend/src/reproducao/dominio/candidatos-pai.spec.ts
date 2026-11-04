import { encontrarCandidatosPai } from './candidatos-pai';

describe('candidatos a pai (research R6)', () => {
  // Parto em 10/05/2027, gestação 291 dias → concepção estimada 22/07/2026;
  // janela de ±21 dias: 01/07/2026 a 12/08/2026
  const base = { dataParto: '2027-05-10', gestacaoMediaDias: 291 };

  it('encontra o touro cuja exposição cobre a janela de concepção', () => {
    const resultado = encontrarCandidatosPai({
      ...base,
      exposicoes: [
        { touroId: 't1', dataInicio: '2026-06-15', dataFim: '2026-09-15' },
      ],
      inseminacoes: [],
    });
    expect(resultado).toEqual({
      touroIds: ['t1'],
      semenIds: [],
      inseminacaoId: null,
    });
  });

  it('ignora exposição fora da janela', () => {
    const resultado = encontrarCandidatosPai({
      ...base,
      exposicoes: [
        { touroId: 't1', dataInicio: '2026-01-01', dataFim: '2026-03-01' },
      ],
      inseminacoes: [],
    });
    expect(resultado.touroIds).toEqual([]);
  });

  it('exposição ainda aberta conta até a data do parto', () => {
    const resultado = encontrarCandidatosPai({
      ...base,
      exposicoes: [{ touroId: 't1', dataInicio: '2026-08-01', dataFim: null }],
      inseminacoes: [],
    });
    expect(resultado.touroIds).toEqual(['t1']);
  });

  it('dois touros no mesmo período viram dois candidatos, sem repetir', () => {
    const resultado = encontrarCandidatosPai({
      ...base,
      exposicoes: [
        { touroId: 't1', dataInicio: '2026-07-01', dataFim: '2026-08-30' },
        { touroId: 't2', dataInicio: '2026-07-10', dataFim: '2026-08-10' },
        { touroId: 't1', dataInicio: '2026-07-05', dataFim: '2026-07-20' },
      ],
      inseminacoes: [],
    });
    expect(resultado.touroIds).toEqual(['t1', 't2']);
  });

  it('inseminação na janela entra como sêmen candidato e liga a inseminação mais próxima', () => {
    const resultado = encontrarCandidatosPai({
      ...base,
      exposicoes: [],
      inseminacoes: [
        { id: 'i1', semenId: 's1', data: '2026-07-05' },
        { id: 'i2', semenId: 's1', data: '2026-07-24' },
        { id: 'i3', semenId: 's2', data: '2026-03-01' },
      ],
    });
    expect(resultado).toEqual({
      touroIds: [],
      semenIds: ['s1'],
      inseminacaoId: 'i2',
    });
  });

  it('sem gestação cadastrada usa 285 dias', () => {
    // concepção 29/07/2026; janela 08/07 a 19/08
    const resultado = encontrarCandidatosPai({
      dataParto: '2027-05-10',
      gestacaoMediaDias: null,
      exposicoes: [
        { touroId: 't1', dataInicio: '2026-08-15', dataFim: '2026-08-31' },
      ],
      inseminacoes: [],
    });
    expect(resultado.touroIds).toEqual(['t1']);
  });
});
