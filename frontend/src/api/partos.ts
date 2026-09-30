import { apiClient } from './client';

export interface Cria {
  brinco: string;
  sexo: 'M' | 'F';
}

export interface CriarPartoDto {
  maeId: string;
  data: string;
  tipo: 'NORMAL' | 'ASSISTIDO';
  resultado: 'VIVO' | 'NATIMORTO';
  observacoes?: string;
  crias?: Cria[];
}

export async function criarParto(dto: CriarPartoDto) {
  const resposta = await apiClient.post('/parto', dto);
  return resposta.data;
}