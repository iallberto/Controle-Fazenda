import { apiClient } from './client';
import type { Categoria } from '../utils/formatadores';

export interface AnimalDoGrupo {
  id: string;
  brinco: string;
  sexo: 'M' | 'F';
  categoria: Categoria;
  pastoAtualId: string | null;
}

export interface FiltroGrupo {
  pastoId?: string;
  categoria?: Categoria;
}

export interface Excecao {
  animalId: string;
  motivo: string;
}

interface SelecaoDoGrupo extends FiltroGrupo {
  animalIds: string[];
  excecoes: Excecao[];
}

export interface TratamentoEmLote extends SelecaoDoGrupo {
  produto: string;
  data: string;
  recorrenciaDias?: number;
  aplicadoPorTipo: 'USUARIO' | 'VETERINARIO';
  aplicadoPorUsuarioId?: string;
  aplicadoPorVeterinarioId?: string;
}

export interface PastoEmLote extends SelecaoDoGrupo {
  pastoDestinoId: string;
  data?: string;
}

export interface SessaoManejo {
  id: string;
  tipo: 'TRATAMENTO' | 'PASTO';
  data: string;
  produto: string | null;
  filtroPasto: string | null;
  filtroCategoria: Categoria | null;
  pastoDestino: string | null;
  totalAnimais: number;
  criadoPor: string | null;
  excecoes: { brinco: string; motivo: string }[];
}

export async function listarGrupo(filtro: FiltroGrupo) {
  const resposta = await apiClient.get<AnimalDoGrupo[]>('/manejo-lote/grupo', { params: filtro });
  return resposta.data;
}

export async function aplicarTratamentoEmLote(dados: TratamentoEmLote) {
  const resposta = await apiClient.post<{ aplicados: number; excecoes: number }>(
    '/manejo-lote/tratamento',
    dados,
  );
  return resposta.data;
}

export async function moverPastoEmLote(dados: PastoEmLote) {
  const resposta = await apiClient.post<{
    movidos: number;
    jaEstavamNoDestino: number;
    excecoes: number;
  }>('/manejo-lote/pasto', dados);
  return resposta.data;
}

export async function listarSessoes() {
  const resposta = await apiClient.get<SessaoManejo[]>('/manejo-lote/sessoes');
  return resposta.data;
}
