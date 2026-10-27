import { apiClient } from './client';

export interface Animal {
  id: string;
  brinco: string;
  sexo: 'M' | 'F';
  categoria: 'BEZERRO' | 'NOVILHA' | 'MATRIZ' | 'GARROTE' | 'BOI' | 'TOURO';
  status: 'ATIVO' | 'VENDIDO' | 'MORTO' | 'DESCARTADO';
  statusReprodutivo: 'PRENHE' | 'LACTANTE' | 'VAZIA' | null;
  origem: 'NASCIDO_FAZENDA' | 'COMPRADO';
  dataNascimento: string;
  mae?: { id: string; brinco: string } | null;
  pastoAtual?: { id: string; nome: string } | null;
}

export interface CriarAnimalDto {
  codigoId: string;
  sexo: 'M' | 'F';
  categoria: 'BEZERRO' | 'NOVILHA' | 'MATRIZ' | 'GARROTE' | 'BOI' | 'TOURO';
  origem: 'NASCIDO_FAZENDA' | 'COMPRADO';
  dataNascimento: string;
  racaId?: string;
  maeId?: string;
  dataCompra?: string;
  procedencia?: string;
  pastoAtualId?: string;
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

export async function buscarPorBrinco(brinco: string): Promise<Animal> {
  const resposta = await apiClient.get<Animal>(`/animal/brinco/${brinco}`);
  return resposta.data;
}

export async function atualizarAnimal(id: string, dados: Partial<CriarAnimalDto>): Promise<Animal> {
  const resposta = await apiClient.patch<Animal>(`/animal/${id}`, dados);
  return resposta.data;
}