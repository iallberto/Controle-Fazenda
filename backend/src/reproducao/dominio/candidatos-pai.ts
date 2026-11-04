import { diasEntre, somarDias } from './datas';
import { GESTACAO_PADRAO_DIAS } from './previsao-parto';

// Tolerância em torno da concepção estimada: um ciclo de cio (research R6)
export const TOLERANCIA_CONCEPCAO_DIAS = 21;

export interface DadosCandidatos {
  dataParto: string;
  gestacaoMediaDias: number | null | undefined;
  exposicoes: { touroId: string; dataInicio: string; dataFim: string | null }[];
  inseminacoes: { id: string; semenId: string; data: string }[];
}

// Touros e sêmens que podem ser o pai: coberturas cuja época bate com a
// concepção estimada (data do parto − gestação, ± um ciclo de cio).
export function encontrarCandidatosPai(dados: DadosCandidatos) {
  const gestacao = dados.gestacaoMediaDias || GESTACAO_PADRAO_DIAS;
  const concepcao = somarDias(dados.dataParto, -gestacao);
  const inicioJanela = somarDias(concepcao, -TOLERANCIA_CONCEPCAO_DIAS);
  const fimJanela = somarDias(concepcao, TOLERANCIA_CONCEPCAO_DIAS);

  const touroIds = [
    ...new Set(
      dados.exposicoes
        .filter(
          (exposicao) =>
            exposicao.dataInicio <= fimJanela &&
            (exposicao.dataFim ?? dados.dataParto) >= inicioJanela,
        )
        .map((exposicao) => exposicao.touroId),
    ),
  ];

  const inseminacoesNaJanela = dados.inseminacoes.filter(
    (inseminacao) =>
      inseminacao.data >= inicioJanela && inseminacao.data <= fimJanela,
  );
  const semenIds = [
    ...new Set(inseminacoesNaJanela.map((inseminacao) => inseminacao.semenId)),
  ];
  const maisProxima = [...inseminacoesNaJanela].sort(
    (a, b) =>
      Math.abs(diasEntre(a.data, concepcao)) -
      Math.abs(diasEntre(b.data, concepcao)),
  )[0];

  return { touroIds, semenIds, inseminacaoId: maisProxima?.id ?? null };
}
