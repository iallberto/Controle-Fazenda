import { diasEntre } from '../reproducao/dominio/datas';

// Situação do prazo de acesso de uma fazenda numa data (spec 008, R3).
// Calculada, não guardada: o vencimento vale sozinho, sem tarefa agendada.
export type SituacaoAcesso =
  | 'SEM_PRAZO'
  | 'AGUARDANDO_IMPLANTACAO'
  | 'EM_DIA'
  | 'CARENCIA'
  | 'VENCIDO';

export const DIAS_CARENCIA = 2;
export const DIAS_AVISO_PAGAMENTO = 5;

export interface AcessoCalculado {
  situacao: SituacaoAcesso;
  acessoAte: string | null;
  // Até o fim do prazo (0 no último dia); nulo sem prazo
  diasRestantes: number | null;
  // Dias de carência que ainda faltam (só em CARENCIA)
  diasCarencia: number | null;
  // Lança normalmente? (SEM_PRAZO, EM_DIA e CARENCIA)
  podeLancar: boolean;
  // Mostrar ao dono a renovação por Pix (últimos 5 dias, carência e vencido)
  mostrarPagamento: boolean;
}

export function acessoDaFazenda(
  fazenda: { semPrazo: boolean; acessoAte: string | null },
  hoje: string,
): AcessoCalculado {
  if (fazenda.semPrazo) {
    return base('SEM_PRAZO', null);
  }
  if (!fazenda.acessoAte) {
    return base('AGUARDANDO_IMPLANTACAO', null);
  }
  const restantes = diasEntre(hoje, fazenda.acessoAte);
  if (restantes >= 0) {
    return {
      ...base('EM_DIA', fazenda.acessoAte),
      diasRestantes: restantes,
      mostrarPagamento: restantes <= DIAS_AVISO_PAGAMENTO,
    };
  }
  const atraso = -restantes;
  if (atraso <= DIAS_CARENCIA) {
    return {
      ...base('CARENCIA', fazenda.acessoAte),
      diasRestantes: restantes,
      diasCarencia: DIAS_CARENCIA - atraso,
      mostrarPagamento: true,
    };
  }
  return {
    ...base('VENCIDO', fazenda.acessoAte),
    diasRestantes: restantes,
    mostrarPagamento: true,
  };
}

function base(situacao: SituacaoAcesso, acessoAte: string | null): AcessoCalculado {
  return {
    situacao,
    acessoAte,
    diasRestantes: null,
    diasCarencia: null,
    podeLancar: situacao === 'SEM_PRAZO' || situacao === 'EM_DIA' || situacao === 'CARENCIA',
    mostrarPagamento: false,
  };
}
