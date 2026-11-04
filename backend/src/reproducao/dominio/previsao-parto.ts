import { diasEntre, somarDias } from './datas';

// Raças sem gestação média cadastrada (research R5)
export const GESTACAO_PADRAO_DIAS = 285;

export type BasePrevisao = 'INSEMINACAO' | 'TOQUE' | 'ESTACAO';

export interface DadosPrevisao {
  // Diagnóstico de prenhez válido mais recente
  diagnostico: { data: string; idadeGestacionalDias: number | null };
  inseminacoes: { data: string }[];
  exposicoes: { dataInicio: string; dataFim: string | null }[];
  gestacaoMediaDias: number | null | undefined;
}

// Data prevista do parto e a base usada, na ordem do FR-018:
// (1) inseminação antes do diagnóstico; (2) idade gestacional informada no toque;
// (3) meio do período de exposição ao(s) touro(s). Sem nenhuma base, null.
export function calcularPrevisaoParto(
  dados: DadosPrevisao,
): { data: string; base: BasePrevisao } | null {
  const gestacao = dados.gestacaoMediaDias || GESTACAO_PADRAO_DIAS;
  const { diagnostico } = dados;

  const inseminacao = dados.inseminacoes
    .filter((item) => item.data <= diagnostico.data)
    .sort((a, b) => b.data.localeCompare(a.data))[0];
  if (inseminacao) {
    return { data: somarDias(inseminacao.data, gestacao), base: 'INSEMINACAO' };
  }

  if (diagnostico.idadeGestacionalDias) {
    const concepcao = somarDias(
      diagnostico.data,
      -diagnostico.idadeGestacionalDias,
    );
    return { data: somarDias(concepcao, gestacao), base: 'TOQUE' };
  }

  const anteriores = dados.exposicoes.filter(
    (item) => item.dataInicio <= diagnostico.data,
  );
  if (anteriores.length === 0) return null;
  const inicio = anteriores.map((item) => item.dataInicio).sort()[0];
  const fim = anteriores
    .map((item) =>
      item.dataFim && item.dataFim < diagnostico.data
        ? item.dataFim
        : diagnostico.data,
    )
    .sort()
    .at(-1)!;
  const meio = somarDias(inicio, Math.floor(diasEntre(inicio, fim) / 2));
  return { data: somarDias(meio, gestacao), base: 'ESTACAO' };
}
