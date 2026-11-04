import { apiClient } from '../../api/client';
import type { Categoria } from '../../utils/formatadores';

// Módulo Financeiro (spec 003). Valores sempre em centavos inteiros.
const BASE = '/modulos/financeiro';

export type TipoLancamento = 'RECEITA' | 'DESPESA';
export type OrigemLancamento = 'MANUAL' | 'VENDA' | 'COMPRA' | 'USO';
export type FormaPreco = 'POR_ARROBA' | 'VALOR_TOTAL';

export interface Cancelamento {
  cancelado: boolean;
  canceladoEm: string | null;
  motivoCancelamento: string | null;
}

export interface CategoriaFinanceira {
  id: string;
  tipo: TipoLancamento;
  nome: string;
  codigo: string | null;
  ativa: boolean;
  padrao: boolean;
}

export interface Lancamento {
  id: string;
  tipo: TipoLancamento;
  data: string;
  valorCentavos: number;
  categoria: { id: string; nome: string } | null;
  descricao: string;
  animal: { id: string; brinco: string } | null;
  pasto: { id: string; nome: string } | null;
  origem: OrigemLancamento;
  vendaId: string | null;
  cancelamento: Cancelamento;
}

export interface MesFinanceiro {
  lancamentos: Lancamento[];
  receitaCentavos: number;
  despesaCentavos: number;
  saldoCentavos: number;
}

export interface NovoLancamento {
  tipo: TipoLancamento;
  data: string;
  valorCentavos: number;
  categoriaId: string;
  descricao: string;
  animalId?: string;
  pastoId?: string;
}

// --- Categorias ---------------------------------------------------------------

export async function listarCategorias(filtro: { tipo?: TipoLancamento; incluirInativas?: boolean } = {}) {
  const resposta = await apiClient.get<CategoriaFinanceira[]>(`${BASE}/categorias`, {
    params: {
      tipo: filtro.tipo,
      incluirInativas: filtro.incluirInativas ? 'true' : undefined,
    },
  });
  return resposta.data;
}

export async function criarCategoria(tipo: TipoLancamento, nome: string) {
  const resposta = await apiClient.post<CategoriaFinanceira>(`${BASE}/categorias`, { tipo, nome });
  return resposta.data;
}

export async function editarCategoria(id: string, dados: { nome?: string; ativa?: boolean }) {
  const resposta = await apiClient.patch<CategoriaFinanceira>(`${BASE}/categorias/${id}`, dados);
  return resposta.data;
}

// --- Lançamentos ---------------------------------------------------------------

export async function listarLancamentos(filtro: { mes: string; tipo?: TipoLancamento; categoriaId?: string }) {
  const resposta = await apiClient.get<MesFinanceiro>(`${BASE}/lancamentos`, { params: filtro });
  return resposta.data;
}

export async function criarLancamento(dados: NovoLancamento) {
  const resposta = await apiClient.post<Lancamento>(`${BASE}/lancamentos`, dados);
  return resposta.data;
}

export async function editarLancamento(
  id: string,
  dados: Partial<Pick<NovoLancamento, 'data' | 'valorCentavos' | 'categoriaId' | 'descricao'>>,
) {
  await apiClient.patch(`${BASE}/lancamentos/${id}`, dados);
}

export async function cancelarLancamento(id: string, motivo: string) {
  await apiClient.post(`${BASE}/lancamentos/${id}/cancelar`, { motivo });
}

// --- Vendas ----------------------------------------------------------------------

export interface AnimalParaVenda {
  id: string;
  brinco: string;
  categoria: Categoria;
  sexo: 'M' | 'F';
  pasto: { id: string; nome: string } | null;
  ultimaPesagem: { data: string; pesoKg: number } | null;
  kgPorArroba: number;
}

export interface DadosVenda {
  data: string;
  comprador: string;
  forma: FormaPreco;
  precoArrobaCentavos?: number;
  valorTotalCentavos?: number;
  observacao?: string;
  itens: { animalId: string; pesoKg?: number }[];
}

export interface SimulacaoVenda {
  itens: { animalId: string; arrobas: number | null; valorCentavos: number }[];
  arrobasTotal: number;
  valorTotalCentavos: number;
}

export interface VendaResumo {
  id: string;
  data: string;
  comprador: string;
  forma: FormaPreco;
  valorTotalCentavos: number;
  animais: number;
  cancelamento: Cancelamento;
}

export interface VendaDetalhe {
  id: string;
  data: string;
  comprador: string;
  forma: FormaPreco;
  precoArrobaCentavos: number | null;
  valorTotalCentavos: number;
  observacao: string | null;
  cancelamento: Cancelamento;
  itens: {
    animalId: string;
    brinco: string;
    categoria: Categoria;
    pesoKg: number | null;
    arrobas: number | null;
    valorCentavos: number;
    pastoAnterior: string | null;
  }[];
}

export interface VendaDoAnimal {
  vendaId: string;
  data: string;
  comprador: string;
  pesoKg: number | null;
  arrobas: number | null;
  valorCentavos: number;
}

export async function listarAnimaisParaVenda(filtro: { pastoId?: string; categoria?: string } = {}) {
  const resposta = await apiClient.get<AnimalParaVenda[]>(`${BASE}/vendas/animais-disponiveis`, {
    params: filtro,
  });
  return resposta.data;
}

export async function simularVenda(dados: DadosVenda) {
  const resposta = await apiClient.post<SimulacaoVenda>(`${BASE}/vendas/simular`, dados);
  return resposta.data;
}

export async function registrarVenda(dados: DadosVenda) {
  const resposta = await apiClient.post<VendaDetalhe>(`${BASE}/vendas`, dados);
  return resposta.data;
}

export async function listarVendas(periodo: { de?: string; ate?: string } = {}) {
  const resposta = await apiClient.get<VendaResumo[]>(`${BASE}/vendas`, { params: periodo });
  return resposta.data;
}

export async function buscarVenda(id: string) {
  const resposta = await apiClient.get<VendaDetalhe>(`${BASE}/vendas/${id}`);
  return resposta.data;
}

export async function cancelarVenda(id: string, motivo: string) {
  await apiClient.post(`${BASE}/vendas/${id}/cancelar`, { motivo });
}

export async function buscarVendaDoAnimal(animalId: string) {
  const resposta = await apiClient.get<VendaDoAnimal>(`${BASE}/vendas/animal/${animalId}`);
  return resposta.data;
}
