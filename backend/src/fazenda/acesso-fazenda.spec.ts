import { acessoDaFazenda } from './acesso-fazenda';

describe('acessoDaFazenda (spec 008, R3)', () => {
  const comPrazo = (acessoAte: string) => ({ semPrazo: false, acessoAte });

  it('sem prazo: lança sempre, sem aviso', () => {
    expect(acessoDaFazenda({ semPrazo: true, acessoAte: null }, '2026-11-10')).toMatchObject({
      situacao: 'SEM_PRAZO',
      podeLancar: true,
      mostrarPagamento: false,
    });
  });

  it('sem prazo definido: aguardando implantação, só consulta', () => {
    expect(acessoDaFazenda({ semPrazo: false, acessoAte: null }, '2026-11-10')).toMatchObject({
      situacao: 'AGUARDANDO_IMPLANTACAO',
      podeLancar: false,
    });
  });

  it('em dia: dias restantes; aviso de pagamento só nos últimos 5 dias', () => {
    expect(acessoDaFazenda(comPrazo('2026-12-10'), '2026-11-10')).toMatchObject({
      situacao: 'EM_DIA',
      diasRestantes: 30,
      mostrarPagamento: false,
    });
    expect(acessoDaFazenda(comPrazo('2026-11-15'), '2026-11-10')).toMatchObject({
      situacao: 'EM_DIA',
      diasRestantes: 5,
      mostrarPagamento: true,
    });
    expect(acessoDaFazenda(comPrazo('2026-11-10'), '2026-11-10')).toMatchObject({
      situacao: 'EM_DIA',
      diasRestantes: 0,
      podeLancar: true,
    });
  });

  it('carência de 2 dias: ainda lança; depois vencido e só consulta', () => {
    expect(acessoDaFazenda(comPrazo('2026-11-10'), '2026-11-11')).toMatchObject({
      situacao: 'CARENCIA',
      diasCarencia: 1,
      podeLancar: true,
    });
    expect(acessoDaFazenda(comPrazo('2026-11-10'), '2026-11-12')).toMatchObject({
      situacao: 'CARENCIA',
      diasCarencia: 0,
      podeLancar: true,
    });
    expect(acessoDaFazenda(comPrazo('2026-11-10'), '2026-11-13')).toMatchObject({
      situacao: 'VENCIDO',
      podeLancar: false,
      mostrarPagamento: true,
    });
  });
});
