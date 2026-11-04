import { diasEntre, somarDias } from './datas';

// Janela em que um diagnóstico ainda se refere àquela cobertura (research R12)
export const JANELA_DIAGNOSTICO_DIAS = 300;

export interface CoberturaParaTaxa {
  femeaId: string;
  // Início da exposição ao touro ou data da inseminação
  inicio: string;
  // A fêmea saiu do rebanho (vendida, morta, descartada)
  saiu: boolean;
}

export interface DiagnosticoParaTaxa {
  femeaId: string;
  data: string;
  resultado: 'PRENHE' | 'VAZIA' | 'PERDA';
}

export interface TaxaPrenhez {
  cobertas: number;
  prenhes: number;
  vazias: number;
  semDiagnostico: number;
  sairam: number;
  // prenhes ÷ (prenhes + vazias); null quando ninguém foi diagnosticada
  taxa: number | null;
}

// Taxa de prenhez de um grupo de coberturas (uma estação, um touro ou um sêmen).
// Cada fêmea conta uma vez, a partir da primeira cobertura dela no grupo; vale o
// primeiro diagnóstico (prenhe ou vazia) depois dessa data e em até 300 dias.
// Sem diagnóstico, fica fora do denominador: "saíram" se deixou o rebanho,
// "sem diagnóstico" se ainda está nele (FR-028). Diagnósticos no mesmo dia
// mantêm a ordem recebida (o serviço manda na ordem em que foram lançados).
export function calcularTaxaPrenhez(
  coberturas: CoberturaParaTaxa[],
  diagnosticos: DiagnosticoParaTaxa[],
): TaxaPrenhez {
  const porFemea = new Map<string, CoberturaParaTaxa>();
  for (const cobertura of coberturas) {
    const atual = porFemea.get(cobertura.femeaId);
    if (!atual || cobertura.inicio < atual.inicio) {
      porFemea.set(cobertura.femeaId, cobertura);
    }
  }

  const ordenados = diagnosticos
    .filter((d) => d.resultado !== 'PERDA')
    .sort((a, b) => a.data.localeCompare(b.data));

  const resultado: TaxaPrenhez = {
    cobertas: porFemea.size,
    prenhes: 0,
    vazias: 0,
    semDiagnostico: 0,
    sairam: 0,
    taxa: null,
  };
  for (const cobertura of porFemea.values()) {
    const limite = somarDias(cobertura.inicio, JANELA_DIAGNOSTICO_DIAS);
    const diagnostico = ordenados.find(
      (d) =>
        d.femeaId === cobertura.femeaId &&
        d.data > cobertura.inicio &&
        d.data <= limite,
    );
    if (diagnostico?.resultado === 'PRENHE') resultado.prenhes++;
    else if (diagnostico?.resultado === 'VAZIA') resultado.vazias++;
    else if (cobertura.saiu) resultado.sairam++;
    else resultado.semDiagnostico++;
  }
  const diagnosticadas = resultado.prenhes + resultado.vazias;
  resultado.taxa =
    diagnosticadas > 0 ? resultado.prenhes / diagnosticadas : null;
  return resultado;
}

export function somarTaxas(taxas: TaxaPrenhez[]): TaxaPrenhez {
  const soma = taxas.reduce(
    (total, t) => ({
      cobertas: total.cobertas + t.cobertas,
      prenhes: total.prenhes + t.prenhes,
      vazias: total.vazias + t.vazias,
      semDiagnostico: total.semDiagnostico + t.semDiagnostico,
      sairam: total.sairam + t.sairam,
      taxa: null as number | null,
    }),
    {
      cobertas: 0,
      prenhes: 0,
      vazias: 0,
      semDiagnostico: 0,
      sairam: 0,
      taxa: null,
    },
  );
  const diagnosticadas = soma.prenhes + soma.vazias;
  soma.taxa = diagnosticadas > 0 ? soma.prenhes / diagnosticadas : null;
  return soma;
}

// Intervalo entre partos (FR-029): dias entre partos seguidos de cada mãe.
// Partos no mesmo dia (gêmeos registrados em separado) contam como um só.
export function calcularIntervalosPartos(
  partos: { maeId: string; data: string }[],
) {
  const datasPorMae = new Map<string, string[]>();
  for (const parto of partos) {
    const datas = datasPorMae.get(parto.maeId) ?? [];
    if (!datas.includes(parto.data)) datas.push(parto.data);
    datasPorMae.set(parto.maeId, datas);
  }

  const porMatriz: {
    maeId: string;
    partos: number;
    ultimoIntervaloDias: number;
    mediaDias: number;
  }[] = [];
  const todos: number[] = [];
  for (const [maeId, datas] of datasPorMae) {
    if (datas.length < 2) continue;
    datas.sort();
    const intervalos = datas
      .slice(1)
      .map((data, i) => diasEntre(datas[i], data));
    todos.push(...intervalos);
    porMatriz.push({
      maeId,
      partos: datas.length,
      ultimoIntervaloDias: intervalos[intervalos.length - 1],
      mediaDias: Math.round(
        intervalos.reduce((a, b) => a + b, 0) / intervalos.length,
      ),
    });
  }
  const mediaRebanhoDias =
    todos.length > 0
      ? Math.round(todos.reduce((a, b) => a + b, 0) / todos.length)
      : null;
  return { porMatriz, mediaRebanhoDias };
}
