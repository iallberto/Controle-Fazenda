import { apiClient } from './client';

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
  responsavel: string;
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