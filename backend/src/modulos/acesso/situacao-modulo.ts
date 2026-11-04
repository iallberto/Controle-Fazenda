import { formatarDataLocal } from '../../common/datas';
import { diasEntre } from '../../reproducao/dominio/datas';
import type { SituacaoModulo } from './modulo-pago';

export interface PeriodoModulo {
  dataInicio: string;
  dataTermino: string | null;
  desativadoEm: Date | null;
}

export interface SituacaoCalculada {
  situacao: SituacaoModulo;
  // Do período ativo, quando houver
  dataTermino: string | null;
  diasParaVencer: number | null;
}

// Situação de um módulo para uma fazenda numa data, a partir dos períodos de
// contrato (research R3). Calculada, não guardada: o vencimento vale sozinho.
// - ATIVO: período não desativado com início ≤ hoje e término vazio ou ≥ hoje;
// - SO_CONSULTA: não ativo, mas já teve um período que chegou a começar;
// - NAO_CONTRATADO: nenhum período começado (um desativado antes de começar
//   não conta).
export function situacaoDoModulo(
  periodos: PeriodoModulo[],
  hoje: string,
): SituacaoCalculada {
  const ativo = periodos.find(
    (p) =>
      !p.desativadoEm &&
      p.dataInicio <= hoje &&
      (!p.dataTermino || hoje <= p.dataTermino),
  );
  if (ativo) {
    return {
      situacao: 'ATIVO',
      dataTermino: ativo.dataTermino,
      diasParaVencer: ativo.dataTermino
        ? diasEntre(hoje, ativo.dataTermino)
        : null,
    };
  }

  const jaTeve = periodos.some((p) => {
    if (p.dataInicio > hoje) return false;
    if (!p.desativadoEm) return true; // vencido
    // Desativado depois de começar
    return formatarDataLocal(p.desativadoEm) >= p.dataInicio;
  });
  return {
    situacao: jaTeve ? 'SO_CONSULTA' : 'NAO_CONTRATADO',
    dataTermino: null,
    diasParaVencer: null,
  };
}
