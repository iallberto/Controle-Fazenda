import { apiClient } from './client';

export interface Pesagem {
  id: string;
  pesoKg: string;
  data: string;
  observacao: string | null;
  gmdDesdeAnterior: number | null;
}

export interface CriarPesagemDto {
  animalId: string;
  pesoKg: number;
  data: string;
  pesadoPorId?: string;
  observacao?: string;
}

export async function criarPesagem(dto: CriarPesagemDto): Promise<Pesagem> {
  const resposta = await apiClient.post<Pesagem>('/pesagem', dto);
  return resposta.data;
}

export async function listarPesagensPorAnimal(animalId: string): Promise<Pesagem[]> {
  const resposta = await apiClient.get<Pesagem[]>(`/pesagem/animal/${animalId}`);
  return resposta.data;
}