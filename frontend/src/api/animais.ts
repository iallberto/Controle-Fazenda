import { apiClient } from './client';

export interface Animal {
  id: string;
  brinco: string;
  sexo: 'M' | 'F';
  categoria: 'BEZERRO' | 'NOVILHA' | 'MATRIZ' | 'TOURO';
  status: 'ATIVO' | 'VENDIDO' | 'MORTO' | 'DESCARTADO';
  statusReprodutivo: 'PRENHE' | 'LACTANTE' | 'VAZIA' | null;
  origem: 'NASCIDO_FAZENDA' | 'COMPRADO';
  dataNascimento: string;
}

export interface CriarAnimalDto {
  brinco: string;
  sexo: 'M' | 'F';
  categoria: 'BEZERRO' | 'NOVILHA' | 'MATRIZ' | 'TOURO';
  origem: 'NASCIDO_FAZENDA' | 'COMPRADO';
  dataNascimento: string;
  racaId?: string;
  maeId?: string;
  dataCompra?: string;
  procedencia?: string;
}

export async function listarAnimais(categoria?: string): Promise<Animal[]> {
  const resposta = await apiClient.get<Animal[]>('/animal', { params: { categoria } });
  return resposta.data;
}

export async function criarAnimal(dto: CriarAnimalDto): Promise<Animal> {
  const resposta = await apiClient.post<Animal>('/animal', dto);
  return resposta.data;
}

export async function buscarAnimal(id: string): Promise<Animal> {
  const resposta = await apiClient.get<Animal>(`/animal/${id}`);
  return resposta.data;
}