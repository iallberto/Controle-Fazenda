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
  secagemPlanejada: string | null;
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
    | (ResumoLactacao & {
        id: string;
        inicio: string;
        origem: 'PARTO' | 'MANUAL';
        del: number;
        partoPrevisto: string | null;
        secagemPlanejada: string | null;
      })
    | null;
  encerradas: (ResumoLactacao & {
    id: string;
    inicio: string;
    fim: string;
    motivoFim: 'SECAGEM' | 'SAIDA' | 'NOVO_PARTO';
    dias: number;
    secagemId: string | null;
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

// "12,5" → 12.5; "1.050,5" → 1050.5; "12.5" → 12.5; vazio ou inválido → null
export function litrosDeTexto(texto: string): number | null {
  const aparado = texto.trim().replace(/\s|L$/gi, '');
  // Com vírgula, o ponto é separador de milhar; sem vírgula, o ponto é decimal
  const limpo = aparado.includes(',') ? aparado.replace(/\./g, '').replace(',', '.') : aparado;
  if (limpo === '') return null;
  const valor = Number(limpo);
  return Number.isFinite(valor) ? valor : null;
}

// --- Secagem (US3) -----------------------------------------------------------

export interface VacaASecar {
  animalId: string;
  brinco: string;
  del: number;
  partoPrevisto: string;
  secagemPlanejada: string;
  atrasada: boolean;
  mediaUltimos7Dias: number | null;
}

export async function listarASecar(dias?: number) {
  return (
    await apiClient.get<VacaASecar[]>(`${BASE}/secagens/a-secar`, { params: dias ? { dias } : {} })
  ).data;
}

export async function registrarSecagem(dados: { animalId: string; data: string; observacao?: string }) {
  return (await apiClient.post(`${BASE}/secagens`, dados)).data;
}

export async function cancelarSecagem(id: string, motivo: string) {
  return (await apiClient.post(`${BASE}/secagens/${id}/cancelar`, { motivo })).data;
}

// --- Entregas e análises (US4) -----------------------------------------------

export interface EntregaLeite {
  id: string;
  data: string;
  litros: number;
  observacao: string | null;
  cancelamento: { cancelado: boolean; motivoCancelamento: string | null };
  // Só para o dono
  precoLitroCentavos?: number | null;
  valorCentavos?: number | null;
}

export interface MesDeEntregas {
  mes: string;
  entregas: EntregaLeite[];
  totalLitros: number;
  paraTanque: number;
  diferenca: number;
  // Só para o dono
  totalCentavos?: number;
  entregasSemPreco?: number;
}

export interface AnaliseLeite {
  id: string;
  mes: string;
  entrega: { id: string; data: string } | null;
  ccsMil: number | null;
  cbtMil: number | null;
  gordura: number | null;
  proteina: number | null;
  cancelamento: { cancelado: boolean; motivoCancelamento: string | null };
}

export async function listarEntregas(mes: string) {
  return (await apiClient.get<MesDeEntregas>(`${BASE}/entregas`, { params: { mes } })).data;
}

export async function criarEntrega(dados: {
  data: string;
  litros: number;
  observacao?: string;
  precoLitroCentavos?: number;
}) {
  return (await apiClient.post(`${BASE}/entregas`, dados)).data;
}

export async function cancelarEntrega(id: string, motivo: string) {
  return (await apiClient.post(`${BASE}/entregas/${id}/cancelar`, { motivo })).data;
}

export async function informarPrecoDoMes(mes: string, precoLitroCentavos: number) {
  return (
    await apiClient.post<{ atualizadas: number }>(`${BASE}/entregas/preco-do-mes`, {
      mes,
      precoLitroCentavos,
    })
  ).data;
}

export async function informarPrecoDaEntrega(id: string, precoLitroCentavos: number) {
  return (await apiClient.post(`${BASE}/entregas/${id}/preco`, { precoLitroCentavos })).data;
}

export async function listarAnalises() {
  return (await apiClient.get<AnaliseLeite[]>(`${BASE}/analises`)).data;
}

export async function criarAnalise(dados: {
  mes: string;
  entregaId?: string;
  ccsMil?: number;
  cbtMil?: number;
  gordura?: number;
  proteina?: number;
}) {
  return (await apiClient.post(`${BASE}/analises`, dados)).data;
}

export async function cancelarAnalise(id: string, motivo: string) {
  return (await apiClient.post(`${BASE}/analises/${id}/cancelar`, { motivo })).data;
}

// --- Relatórios (US5) --------------------------------------------------------

export interface LinhaProducao {
  paraTanque: number;
  descartado: number;
  total: number;
  mediaPorVaca: number | null;
}

export interface ProducaoDiaria {
  de: string;
  ate: string;
  dias: (LinhaProducao & { data: string; vacasEmLactacao: number })[];
  totais: LinhaProducao;
}

export interface ProducaoMensal {
  de: string;
  ate: string;
  meses: (LinhaProducao & { mes: string })[];
  totais: LinhaProducao;
}

export interface CurvaLactacao {
  lactacaoId: string;
  inicio: string;
  fim: string | null;
  pontos: { data: string; del: number; litros: number | null; descarte: boolean }[];
}

export async function buscarProducaoDiaria(de?: string, ate?: string) {
  return (await apiClient.get<ProducaoDiaria>(`${BASE}/producao/diaria`, { params: { de, ate } })).data;
}

export async function buscarProducaoMensal() {
  return (await apiClient.get<ProducaoMensal>(`${BASE}/producao/mensal`)).data;
}

export async function buscarCurva(animalId: string, lactacaoId?: string) {
  return (
    await apiClient.get<CurvaLactacao>(`${BASE}/vacas/${animalId}/curva`, {
      params: lactacaoId ? { lactacaoId } : {},
    })
  ).data;
}

// --- Recebimento do mês (spec 006, só dono) ----------------------------------

export interface RecebimentoDoMes {
  mes: string;
  recebimento: {
    id: string;
    data: string;
    litros: number;
    totalCalculadoCentavos: number;
    valorRecebidoCentavos: number;
    diferencaCentavos: number;
    observacao: string | null;
  } | null;
  previsto: {
    entregas: number;
    litros: number;
    totalCalculadoCentavos: number;
    entregasSemPreco: { id: string; data: string; litros: number }[];
  };
}

export async function buscarRecebimento(mes: string) {
  return (await apiClient.get<RecebimentoDoMes>(`${BASE}/recebimentos`, { params: { mes } })).data;
}

export async function confirmarRecebimento(dados: { mes: string; data: string; valorRecebidoCentavos?: number; observacao?: string }) {
  return (await apiClient.post(`${BASE}/recebimentos`, dados)).data;
}

export async function desfazerRecebimento(id: string, motivo: string) {
  return (await apiClient.post(`${BASE}/recebimentos/${id}/desfazer`, { motivo })).data;
}
