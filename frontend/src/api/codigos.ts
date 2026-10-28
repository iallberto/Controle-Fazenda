import { apiClient } from './client';
import type { Animal } from './animais';

export interface Codigo {
  id: string;
  codigo: string;
  numero: number;
  status: 'DISPONIVEL' | 'VINCULADO' | 'DESATIVADO';
  animalId: string | null;
  animal?: { id: string; brinco: string } | null;
}

export interface FiltroCodigos {
  status?: Codigo['status'];
  de?: number;
  ate?: number;
}

export interface HistoricoNumero {
  id: string;
  animalId: string;
  numeroAnterior: string;
  numeroNovo: string;
  motivo: string | null;
  reemitidoEm: string;
}

export interface BuscaPorNumero {
  animal: Animal;
  numeroBuscado: string;
  reemitido: boolean;
  aviso: string | null;
}

export async function listarDisponiveis(): Promise<Codigo[]> {
  const resposta = await apiClient.get<Codigo[]>('/codigo/disponiveis');
  return resposta.data;
}

export async function listarCodigos(filtro: FiltroCodigos = {}): Promise<Codigo[]> {
  const resposta = await apiClient.get<Codigo[]>('/codigo', { params: filtro });
  return resposta.data;
}

export async function gerarLote(quantidade: number): Promise<Codigo[]> {
  const resposta = await apiClient.post<Codigo[]>('/codigo/lote', { quantidade });
  return resposta.data;
}

export async function vincularCodigo(codigo: string, animalId: string) {
  const resposta = await apiClient.post(`/codigo/${codigo}/vincular`, { animalId });
  return resposta.data;
}

export async function reemitirCodigo(
  animalId: string,
  motivo?: string,
): Promise<Codigo> {
  const resposta = await apiClient.post<Codigo>('/codigo/reemitir', {
    animalId,
    motivo: motivo?.trim() ? motivo.trim() : undefined,
  });
  return resposta.data;
}

export async function buscarPorNumero(numero: string): Promise<BuscaPorNumero> {
  const resposta = await apiClient.get<BuscaPorNumero>(
    `/codigo/numero/${encodeURIComponent(numero.trim())}`,
  );
  return resposta.data;
}

export async function listarHistoricoNumero(
  animalId: string,
): Promise<HistoricoNumero[]> {
  const resposta = await apiClient.get<HistoricoNumero[]>(
    `/codigo/animal/${animalId}/historico`,
  );
  return resposta.data;
}