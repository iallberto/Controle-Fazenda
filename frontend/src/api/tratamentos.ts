import { apiClient } from './client';

export interface CriarTratamentoDto {
  animalId: string;
  produto: string;
  data: string;
  responsavel: string;
  recorrenciaDias?: number;
}

export async function criarTratamento(dto: CriarTratamentoDto) {
  const resposta = await apiClient.post('/tratamento', dto);
  return resposta.data;
}