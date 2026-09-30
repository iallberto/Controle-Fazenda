import { apiClient } from './client';

export interface Codigo {
  id: string;
  codigo: string;
  status: 'DISPONIVEL' | 'VINCULADO' | 'DESATIVADO';
}

export async function gerarLote(quantidade: number): Promise<Codigo[]> {
  const resposta = await apiClient.post<Codigo[]>('/codigo/lote', { quantidade });
  return resposta.data;
}

export async function vincularCodigo(codigo: string, animalId: string) {
  const resposta = await apiClient.post(`/codigo/${codigo}/vincular`, { animalId });
  return resposta.data;
}