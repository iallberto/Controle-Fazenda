import { apiClient } from './client';

export interface MoverAnimalDto {
  animalId: string;
  pastoId: string;
  data?: string;
}

export async function moverAnimal(dto: MoverAnimalDto) {
  const resposta = await apiClient.post('/movimentacao-pasto', dto);
  return resposta.data;
}