import { apiClient } from './client';

export interface Veterinario {
  id: string;
  nome: string;
  crmv: string | null;
  ativo: boolean;
}

export async function listarVeterinarios(): Promise<Veterinario[]> {
  const resposta = await apiClient.get<Veterinario[]>('/veterinario');
  return resposta.data;
}

export async function criarVeterinario(nome: string, crmv?: string): Promise<Veterinario> {
  const resposta = await apiClient.post<Veterinario>('/veterinario', { nome, crmv });
  return resposta.data;
}