import { apiClient } from './client';

export interface CriarTratamentoDto {
  animalId: string;
  produto: string;
  data: string;
  recorrenciaDias?: number;
  aplicadoPorTipo: 'USUARIO' | 'VETERINARIO';
  aplicadoPorUsuarioId?: string;
  aplicadoPorVeterinarioId?: string;
}

export async function criarTratamento(dto: CriarTratamentoDto) {
  const resposta = await apiClient.post('/tratamento', dto);
  return resposta.data;
}
export interface Tratamento {
  id: string;
  produto: string;
  data: string;
  // Nome de quem aplicou; veterinários vêm com "(veterinário)"
  responsavel: string | null;
  recorrenciaDias: number | null;
  proximaDataPrevista: string | null;
}

export async function listarTratamentosPorAnimal(animalId: string): Promise<Tratamento[]> {
  const resposta = await apiClient.get<Tratamento[]>('/tratamento', { params: { animalId } });
  return resposta.data;
}