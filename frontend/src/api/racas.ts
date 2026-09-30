import { apiClient } from './client';

export interface Raca {
  id: string;
  nome: string;
  gestacaoMediaDias: number;
}

export async function listarRacas(): Promise<Raca[]> {
  const resposta = await apiClient.get<Raca[]>('/raca');
  return resposta.data;
}