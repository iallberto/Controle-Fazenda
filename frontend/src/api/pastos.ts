import { apiClient } from './client';

export interface Pasto {
  id: string;
  nome: string;
}

export async function listarPastos(): Promise<Pasto[]> {
  const resposta = await apiClient.get<Pasto[]>('/pasto');
  return resposta.data;
}

export async function criarPasto(nome: string): Promise<Pasto> {
  const resposta = await apiClient.post<Pasto>('/pasto', { nome });
  return resposta.data;
}