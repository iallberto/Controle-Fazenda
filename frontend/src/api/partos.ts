import { apiClient } from './client';

export interface Cria {
  codigoId: string;
  sexo: 'M' | 'F';
}

export interface CriarPartoDto {
  maeId: string;
  data: string;
  tipo: 'NORMAL' | 'ASSISTIDO';
  resultado: 'VIVO' | 'NATIMORTO';
  observacoes?: string;
  crias?: Cria[];
  pastoId?: string;
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
  crias: {
    id: string;
    brinco: string;
    sexo: string;
    paiId: string | null;
    paiSemenId: string | null;
  }[];
  // Possíveis pais gravados no parto (US4); com mais de um, o dono escolhe
  candidatos?: {
    touroId: string | null;
    semenId: string | null;
    touro?: { id: string; brinco: string } | null;
    semen?: { id: string; nomeTouro: string } | null;
  }[];
}

export async function definirPaiDoParto(partoId: string, pai: { touroId?: string; semenId?: string }) {
  const resposta = await apiClient.patch<Parto>(`/parto/${partoId}/pai`, pai);
  return resposta.data;
}

export async function listarPartosPorMae(maeId: string): Promise<Parto[]> {
  const resposta = await apiClient.get<Parto[]>('/parto', { params: { maeId } });
  return resposta.data;
}