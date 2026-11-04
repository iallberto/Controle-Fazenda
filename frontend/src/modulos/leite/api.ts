import axios from 'axios';
import { apiClient } from '../../api/client';

// Módulo Leite (spec 004). Litros com uma casa decimal.
const BASE = '/modulos/leite';

export type ModoOrdenha = 'POR_VACA' | 'TANQUE';
export type VacaDeLeite = 'PELA_RACA' | 'SIM' | 'NAO';
export type SituacaoLeiteira = 'EM_LACTACAO' | 'SECA' | 'NENHUMA';

export interface ConfiguracaoLeite {
  modo: ModoOrdenha;
  ordenhasPorDia: number;
  prazoSecagemDias: number;
  janelaSecarDias: number;
}

export interface VacaResumo {
  animalId: string;
  brinco: string;
  raca: string | null;
  situacao: SituacaoLeiteira;
  inicio: string | null;
  del: number | null;
  carenciaAte: string | null;
}

export interface ResumoLactacao {
  totalLitros: number;
  mediaPorDia: number | null;
  pico: number | null;
  diasComOrdenha: number;
}

export interface VacaDetalhe {
  animalId: string;
  brinco: string;
  raca: string | null;
  racaLeiteira: boolean;
  vacaDeLeite: VacaDeLeite;
  ehVacaDeLeite: boolean;
  situacao: SituacaoLeiteira;
  lactacaoAtual:
    | (ResumoLactacao & { id: string; inicio: string; origem: 'PARTO' | 'MANUAL'; del: number })
    | null;
  encerradas: (ResumoLactacao & {
    id: string;
    inicio: string;
    fim: string;
    motivoFim: 'SECAGEM' | 'SAIDA' | 'NOVO_PARTO';
    dias: number;
  })[];
  carenciaAte: string | null;
  partoRecente: { partoId: string; data: string } | null;
}

export interface VacaDoTurno {
  animalId: string;
  lactacaoId: string;
  brinco: string;
  raca: string | null;
  del: number;
  litrosAnterior: number | null;
  carenciaAte: string | null;
  litros: number | null;
  descarte: boolean | null;
}

export interface Turno {
  modo: ModoOrdenha;
  ordenhasPorDia: number;
  data: string;
  turno: number;
  vacas: VacaDoTurno[];
  tanque: number | null;
}

export interface DiaDeOrdenha {
  data: string;
  vacas: {
    animalId: string;
    brinco: string;
    turnos: Record<string, number>;
    total: number;
    descarte: number;
  }[];
  tanque: Record<string, number>;
  paraTanque: number;
  descartado: number;
}

export interface ProdutoLeite {
  id: string;
  nome: string;
  carenciaLeiteDias: number;
  ativo: boolean;
}

export interface CarenciaHoje {
  animalId: string;
  brinco: string;
  produto: string;
  dataFim: string;
}

// --- Configuração ------------------------------------------------------------

export async function buscarConfiguracao() {
  return (await apiClient.get<ConfiguracaoLeite>(`${BASE}/configuracao`)).data;
}

export async function salvarConfiguracao(dados: Partial<ConfiguracaoLeite>) {
  return (await apiClient.patch<ConfiguracaoLeite>(`${BASE}/configuracao`, dados)).data;
}

// --- Vacas e lactação --------------------------------------------------------

export async function listarVacas(situacao: 'EM_LACTACAO' | 'SECA' | 'TODAS' = 'EM_LACTACAO') {
  return (await apiClient.get<VacaResumo[]>(`${BASE}/vacas`, { params: { situacao } })).data;
}

export async function buscarVaca(animalId: string) {
  return (await apiClient.get<VacaDetalhe>(`${BASE}/vacas/${animalId}`)).data;
}

export async function alterarVacaDeLeite(animalId: string, vacaDeLeite: VacaDeLeite) {
  return (
    await apiClient.patch<VacaDetalhe>(`${BASE}/vacas/${animalId}/vaca-de-leite`, { vacaDeLeite })
  ).data;
}

export async function iniciarLactacao(dados: { animalId: string; inicio: string; partoId?: string }) {
  return (await apiClient.post(`${BASE}/lactacoes`, dados)).data;
}

// --- Ordenha -----------------------------------------------------------------

export async function buscarTurno(filtro: { data?: string; turno?: number }) {
  return (await apiClient.get<Turno>(`${BASE}/ordenhas/turno`, { params: filtro })).data;
}

export async function gravarOrdenhaVaca(dados: {
  data: string;
  turno: number;
  animalId: string;
  litros: number;
  confirmarAcima?: boolean;
}) {
  return (
    await apiClient.put<{ litros: number; descarte: boolean; carenciaAte: string | null }>(
      `${BASE}/ordenhas/vaca`,
      dados,
    )
  ).data;
}

export async function gravarOrdenhaTanque(dados: { data: string; turno: number; litros: number }) {
  return (await apiClient.put<{ litros: number }>(`${BASE}/ordenhas/tanque`, dados)).data;
}

export async function buscarDia(data: string) {
  return (await apiClient.get<DiaDeOrdenha>(`${BASE}/ordenhas/dia`, { params: { data } })).data;
}

// --- Produtos e carência -----------------------------------------------------

export async function listarProdutos(incluirInativos = false) {
  return (
    await apiClient.get<ProdutoLeite[]>(`${BASE}/produtos`, {
      params: incluirInativos ? { incluirInativos: 'true' } : {},
    })
  ).data;
}

export async function criarProduto(dados: { nome: string; carenciaLeiteDias: number }) {
  return (await apiClient.post<ProdutoLeite>(`${BASE}/produtos`, dados)).data;
}

export async function editarProduto(
  id: string,
  dados: Partial<Pick<ProdutoLeite, 'nome' | 'carenciaLeiteDias' | 'ativo'>>,
) {
  return (await apiClient.patch<ProdutoLeite>(`${BASE}/produtos/${id}`, dados)).data;
}

export async function listarCarenciasHoje() {
  return (await apiClient.get<CarenciaHoje[]>(`${BASE}/carencias`)).data;
}

// Código de erro do backend (ex.: PRODUTO_SEM_CADASTRO), quando houver
export function codigoDoErro(erro: unknown): string | null {
  return axios.isAxiosError(erro) ? (erro.response?.data?.codigo ?? null) : null;
}

// "12,5 L"
export function formatarLitros(litros: number | null | undefined) {
  if (litros === null || litros === undefined) return '—';
  return `${litros.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L`;
}

// "12,5" → 12.5; vazio ou inválido → null
export function litrosDeTexto(texto: string): number | null {
  const limpo = texto.trim().replace(',', '.');
  if (limpo === '') return null;
  const valor = Number(limpo);
  return Number.isFinite(valor) ? valor : null;
}
