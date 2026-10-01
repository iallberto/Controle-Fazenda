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

export interface Parto {
  id: string;
  data: string;
  tipo: string;
  resultado: string;
  observacoes: string | null;
  crias: { id: string; brinco: string; sexo: string }[];
}

export async function listarPartosPorMae(maeId: string): Promise<Parto[]> {
  const resposta = await apiClient.get<Parto[]>('/parto', { params: { maeId } });
  return resposta.data;
}