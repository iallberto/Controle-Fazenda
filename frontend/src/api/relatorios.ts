import { apiClient } from './client';
import type { Categoria } from '../utils/formatadores';

export interface PainelInicial {
  porCategoria: { categoria: string; total: string }[];
  porPasto: { pasto: string | null; total: string }[];
  nascimentosNoMes: number;
  obitosNoMes: number;
}

export async function buscarPainelInicial(): Promise<PainelInicial> {
  const resposta = await apiClient.get<PainelInicial>('/relatorio/painel-inicial');
  return resposta.data;
}

export interface NascimentoOuNatimorto {
  id: string;
  data: string;
  tipo: string;
  observacoes: string | null;
  crias?: { id: string; brinco: string; sexo: string }[];
}

export interface ObitoPorCausa {
  motivo: string;
  total: string;
}

export interface TratamentoRelatorio {
  id: string;
  produto: string;
  data: string;
  animal: { id: string; brinco: string };
  responsavel: string | null;
}

export interface ProximoTratamento {
  id: string;
  produto: string;
  ultimaAplicacao: string;
  proximaData: string;
  atrasado: boolean;
  animal: { id: string; brinco: string };
}

export interface LinhaPorRaca {
  raca: string;
  total: number;
  femeas: number;
  machos: number;
}

// Doses recorrentes que vencem nos próximos `dias` dias, mais as já atrasadas
export async function buscarProximosTratamentos(dias: number) {
  const resposta = await apiClient.get<ProximoTratamento[]>('/relatorio/proximos-tratamentos', {
    params: { dias },
  });
  return resposta.data;
}

export interface VacaAParir {
  animal: { id: string; brinco: string; categoria: string };
  previsaoParto: string;
  base: 'INSEMINACAO' | 'TOQUE' | 'ESTACAO';
  atrasado: boolean;
  touros: string[];
  semens: string[];
  pasto: string | null;
}

// Prenhes com parto previsto até hoje + dias, mais as atrasadas (FR-019)
export async function buscarVacasAParir(dias: number) {
  const resposta = await apiClient.get<VacaAParir[]>('/relatorio/vacas-a-parir', { params: { dias } });
  return resposta.data;
}

export async function buscarPorRaca() {
  const resposta = await apiClient.get<LinhaPorRaca[]>('/relatorio/por-raca');
  return resposta.data;
}

export async function buscarNascimentos(inicio: string, fim: string) {
  const resposta = await apiClient.get<NascimentoOuNatimorto[]>('/relatorio/nascimentos', {
    params: { inicio, fim },
  });
  return resposta.data;
}

export async function buscarNatimortos(inicio: string, fim: string) {
  const resposta = await apiClient.get<NascimentoOuNatimorto[]>('/relatorio/natimortos', {
    params: { inicio, fim },
  });
  return resposta.data;
}

export async function buscarObitosPorCausa(inicio: string, fim: string) {
  const resposta = await apiClient.get<ObitoPorCausa[]>('/relatorio/obitos-por-causa', {
    params: { inicio, fim },
  });
  return resposta.data;
}

export async function buscarTratamentosPorPeriodo(inicio: string, fim: string) {
  const resposta = await apiClient.get<TratamentoRelatorio[]>('/relatorio/tratamentos', {
    params: { inicio, fim },
  });
  return resposta.data;
}
// --- Indicadores reprodutivos (US6) -----------------------------------------

export interface TaxaPrenhez {
  cobertas: number;
  prenhes: number;
  vazias: number;
  semDiagnostico: number;
  sairam: number;
  // prenhes ÷ (prenhes + vazias); null sem nenhuma diagnosticada
  taxa: number | null;
}

export interface IndicadoresReprodutivos {
  estacoes: (TaxaPrenhez & {
    id: string;
    touro: { id: string; brinco: string | null };
    pasto: string | null;
    dataEntrada: string;
    dataSaida: string | null;
  })[];
  touros: (TaxaPrenhez & { touro: { id: string; brinco: string | null }; estacoes: number })[];
  semens: (TaxaPrenhez & { semen: { id: string; nomeTouro: string | null } })[];
  intervaloPartos: {
    mediaRebanhoDias: number | null;
    porMatriz: {
      animal: { id: string; brinco: string };
      partos: number;
      ultimoIntervaloDias: number;
      mediaDias: number;
    }[];
  };
}

export interface VacaVazia {
  animal: { id: string; brinco: string; categoria: Categoria };
  pasto: string | null;
  ultimoParto: string | null;
  diasDesdeParto: number | null;
  ultimaCobertura: string | null;
  ultimoDiagnostico: string | null;
}

// Taxa de prenhez por estação, touro e sêmen e intervalo entre partos (FR-028, FR-029)
export async function buscarIndicadoresReprodutivos() {
  const resposta = await apiClient.get<IndicadoresReprodutivos>('/relatorio/indicadores-reprodutivos');
  return resposta.data;
}

// Fêmeas vazias para nova cobertura ou descarte (FR-030)
export async function buscarVacasVazias() {
  const resposta = await apiClient.get<VacaVazia[]>('/relatorio/vacas-vazias');
  return resposta.data;
}
