import axios from 'axios';
import { apiClient } from '../../api/client';

// Módulo Nutrição (spec 005). Quantidades sempre com a unidade; dinheiro em
// centavos e só para o dono.
const BASE = '/modulos/nutricao';

export type TipoInsumo = 'SILAGEM' | 'RACAO' | 'SAL_MINERAL' | 'NUCLEO' | 'FENO' | 'CONCENTRADO' | 'OUTRO';
export type UnidadeBase = 'KG' | 'LITRO' | 'UNIDADE';
export type SituacaoEstoque = 'NORMAL' | 'BAIXO' | 'NEGATIVO';
export type MotivoEntrada = 'COMPRA' | 'PRODUCAO';
export type MotivoBaixa = 'PERDA' | 'ESTRAGO' | 'DOACAO' | 'OUTRO';

export const ROTULOS_TIPO: Record<TipoInsumo, string> = {
  SILAGEM: 'Silagem',
  RACAO: 'Ração',
  SAL_MINERAL: 'Sal mineral',
  NUCLEO: 'Núcleo',
  FENO: 'Feno',
  CONCENTRADO: 'Concentrado',
  OUTRO: 'Outro',
};

export const ROTULOS_BASE: Record<UnidadeBase, string> = { KG: 'kg', LITRO: 'litro', UNIDADE: 'unidade' };

export const ROTULOS_MOTIVO: Record<string, string> = {
  COMPRA: 'Compra',
  PRODUCAO: 'Produção própria',
  SILO: 'Abertura de silo',
  PERDA: 'Perda',
  ESTRAGO: 'Estrago',
  DOACAO: 'Doação',
  OUTRO: 'Outro',
  FORNECIMENTO: 'Fornecimento',
};

export interface Unidade {
  id: string;
  nome: string;
  fator: number;
  ativa: boolean;
}

export interface InsumoEstoque {
  id: string;
  nome: string;
  tipo: TipoInsumo;
  unidadeBase: UnidadeBase;
  unidades: Unidade[];
  unidadeCompraId: string | null;
  estoqueMinimoBase: number | null;
  ativo: boolean;
  estoqueBase: number;
  estoqueNaCompra: { unidade: string; quantidade: number } | null;
  situacao: SituacaoEstoque;
  reservaSilosFechadosBase: number;
  custoMedioCentavosPorBase?: number | null;
}

export interface MovimentoHistorico {
  id: string;
  data: string;
  tipo: 'ENTRADA' | 'BAIXA';
  motivo: string;
  quantidade: number;
  unidade: string | null;
  quantidadeBase: number;
  fornecedor: string | null;
  observacao: string | null;
  aguardandoPreco: boolean;
  avulso: boolean;
  cancelamento: { cancelado: boolean; motivoCancelamento: string | null };
  valorCentavos?: number | null;
}

export interface Dieta {
  id: string;
  nome: string;
  ativa: boolean;
  itens: {
    insumoId: string;
    insumo: string;
    insumoAtivo: boolean;
    quantidadePorAnimal: number;
    unidadeId: string;
    unidade: string;
  }[];
  lotes: { id: string; nome: string }[];
}

export interface LoteResumo {
  id: string;
  nome: string;
  ativo: boolean;
  dieta: { id: string; nome: string } | null;
  animais: number;
}

export interface LoteDetalhe {
  id: string;
  nome: string;
  ativo: boolean;
  dietaId: string | null;
  data: string;
  animais: { animalId: string; brinco: string; categoria: string | null; sexo: string | null; pasto: string | null; desde: string }[];
}

export interface ItemSugerido {
  insumoId: string;
  insumo: string;
  unidadeId: string;
  unidade: string;
  quantidadePorAnimal: number;
  quantidade: number;
  estoqueBase: number;
  estoqueNaUnidade: number | null;
  silos: { id: string; nome: string; abertura: string | null }[];
  siloSugeridoId: string | null;
}

export interface Sugestao {
  lote: { id: string; nome: string };
  data: string;
  animais: number;
  dieta: { id: string; nome: string; ativa: boolean } | null;
  itens: ItemSugerido[];
}

export interface FornecimentoLista {
  id: string;
  data: string;
  lote: { id: string; nome: string } | null;
  animais: number;
  itens: { insumoId: string; insumo: string; quantidade: number; unidade: string; quantidadeBase: number; siloId: string | null }[];
  cancelamento: { cancelado: boolean; motivoCancelamento: string | null };
}

// --- Insumos -----------------------------------------------------------------

export async function listarInsumos(incluirInativos = false) {
  return (
    await apiClient.get<InsumoEstoque[]>(`${BASE}/insumos`, {
      params: incluirInativos ? { incluirInativos: 'true' } : {},
    })
  ).data;
}

export async function criarInsumo(dados: { nome: string; tipo: TipoInsumo; unidadeBase: UnidadeBase; estoqueMinimo?: number }) {
  return (await apiClient.post<{ id: string }>(`${BASE}/insumos`, dados)).data;
}

export async function editarInsumo(
  id: string,
  dados: { nome?: string; estoqueMinimo?: number | null; unidadeCompraId?: string | null; ativo?: boolean },
) {
  return (await apiClient.patch(`${BASE}/insumos/${id}`, dados)).data;
}

export async function criarUnidade(insumoId: string, dados: { nome: string; fator: number }) {
  return (await apiClient.post<Unidade>(`${BASE}/insumos/${insumoId}/unidades`, dados)).data;
}

export async function ativarUnidade(insumoId: string, unidadeId: string, ativa: boolean) {
  return (await apiClient.patch(`${BASE}/insumos/${insumoId}/unidades/${unidadeId}`, { ativa })).data;
}

export async function historicoDoInsumo(insumoId: string) {
  return (await apiClient.get<MovimentoHistorico[]>(`${BASE}/insumos/${insumoId}/movimentos`)).data;
}

// --- Entradas e baixas -------------------------------------------------------

export async function lancarEntrada(dados: {
  insumoId: string;
  data: string;
  quantidade: number;
  unidadeId: string;
  motivo: MotivoEntrada;
  fornecedor?: string;
  observacao?: string;
  valorCentavos?: number;
}) {
  return (await apiClient.post(`${BASE}/entradas`, dados)).data;
}

export async function lancarBaixa(dados: {
  insumoId: string;
  data: string;
  quantidade: number;
  unidadeId: string;
  motivo: MotivoBaixa;
  observacao?: string;
}) {
  return (await apiClient.post(`${BASE}/baixas`, dados)).data;
}

export async function cancelarMovimento(id: string, motivo: string) {
  return (await apiClient.post(`${BASE}/movimentos/${id}/cancelar`, { motivo })).data;
}

// --- Dietas e lotes ----------------------------------------------------------

export async function listarDietas() {
  return (await apiClient.get<Dieta[]>(`${BASE}/dietas`)).data;
}

export async function salvarDieta(
  id: string | null,
  dados: { nome: string; itens: { insumoId: string; quantidadePorAnimal: number; unidadeId: string }[] },
) {
  return id
    ? (await apiClient.put(`${BASE}/dietas/${id}`, dados)).data
    : (await apiClient.post(`${BASE}/dietas`, dados)).data;
}

export async function ativarDieta(id: string, ativa: boolean) {
  return (await apiClient.patch(`${BASE}/dietas/${id}`, { ativa })).data;
}

export async function listarLotes() {
  return (await apiClient.get<LoteResumo[]>(`${BASE}/lotes`)).data;
}

export async function buscarLote(id: string) {
  return (await apiClient.get<LoteDetalhe>(`${BASE}/lotes/${id}`)).data;
}

export async function criarLote(dados: { nome: string; dietaId?: string }) {
  return (await apiClient.post<{ id: string }>(`${BASE}/lotes`, dados)).data;
}

export async function editarLote(id: string, dados: { nome?: string; dietaId?: string | null; ativo?: boolean }) {
  return (await apiClient.patch(`${BASE}/lotes/${id}`, dados)).data;
}

export async function incluirNoLote(id: string, animalIds: string[]) {
  return (await apiClient.post<{ incluidos: number }>(`${BASE}/lotes/${id}/animais`, { animalIds })).data;
}

export async function removerDoLote(id: string, animalIds: string[]) {
  return (await apiClient.post<{ removidos: number }>(`${BASE}/lotes/${id}/animais/remover`, { animalIds })).data;
}

// --- Fornecimento ------------------------------------------------------------

export async function buscarSugestao(loteId: string, data: string) {
  return (await apiClient.get<Sugestao>(`${BASE}/fornecimentos/sugestao`, { params: { loteId, data } })).data;
}

export async function gravarFornecimento(dados: {
  loteId: string;
  data: string;
  itens: { insumoId: string; quantidade: number; unidadeId: string; siloId?: string }[];
  confirmarNegativo?: boolean;
}) {
  return (await apiClient.post<{ id: string; animais: number; estoqueNegativo: string[] }>(`${BASE}/fornecimentos`, dados)).data;
}

export async function listarFornecimentos(filtro: { de?: string; ate?: string; loteId?: string }) {
  return (await apiClient.get<FornecimentoLista[]>(`${BASE}/fornecimentos`, { params: filtro })).data;
}

export async function cancelarFornecimento(id: string, motivo: string) {
  return (await apiClient.post(`${BASE}/fornecimentos/${id}/cancelar`, { motivo })).data;
}

// --- Utilitários -------------------------------------------------------------

export function codigoDoErro(erro: unknown): string | null {
  return axios.isAxiosError(erro) ? (erro.response?.data?.codigo ?? null) : null;
}

// "1.050,5" → 1050.5; "12,5" → 12.5; "12.5" → 12.5
export function numeroDeTexto(texto: string): number | null {
  const aparado = texto.trim().replace(/\s/g, '');
  const limpo = aparado.includes(',') ? aparado.replace(/\./g, '').replace(',', '.') : aparado;
  if (limpo === '') return null;
  const valor = Number(limpo);
  return Number.isFinite(valor) ? valor : null;
}

export function formatarQuantidade(valor: number | null | undefined, unidade?: string) {
  if (valor === null || valor === undefined) return '—';
  const texto = valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  return unidade ? `${texto} ${unidade}` : texto;
}

// "1.000 kg · 40 sacos"
export function textoDoEstoque(insumo: InsumoEstoque) {
  const base = formatarQuantidade(insumo.estoqueBase, ROTULOS_BASE[insumo.unidadeBase]);
  if (!insumo.estoqueNaCompra) return base;
  return `${base} · ${formatarQuantidade(insumo.estoqueNaCompra.quantidade, insumo.estoqueNaCompra.unidade)}`;
}
