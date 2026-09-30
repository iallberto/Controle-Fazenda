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