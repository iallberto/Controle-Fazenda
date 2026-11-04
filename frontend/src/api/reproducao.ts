import { apiClient } from './client';
import type { Categoria } from '../utils/formatadores';

// Contratos em specs/001-cobertura-inseminacao/contracts/api.md

export interface Cancelamento {
  cancelado: boolean;
  canceladoEm: string | null;
  motivoCancelamento: string | null;
}

export type MotivoEncerramento = 'MANUAL' | 'TOURO_SAIU_DO_PASTO' | 'TOURO_SAIU_DO_REBANHO';
export type MotivoFimExposicao = 'ESTACAO_ENCERRADA' | 'SAIU_DO_PASTO' | 'SAIU_DO_REBANHO';
export type StatusReprodutivo = 'PRENHA' | 'VAZIA' | 'LACTANTE' | null;

export interface FemeaApta {
  id: string;
  brinco: string;
  categoria: Categoria;
  statusReprodutivo: StatusReprodutivo;
}

export interface EstacaoResumo {
  id: string;
  touro: { id: string; brinco: string };
  pasto: { id: string; nome: string };
  dataEntrada: string;
  dataSaida: string | null;
  motivoEncerramento: MotivoEncerramento | null;
  expostas: number;
}

export interface Exposicao {
  id: string;
  femea: { id: string; brinco: string; categoria: Categoria };
  dataInicio: string;
  dataFim: string | null;
  motivoFim: MotivoFimExposicao | null;
  cancelamento: Cancelamento;
}

export interface EstacaoDetalhe extends Omit<EstacaoResumo, 'expostas'> {
  cancelamento: Cancelamento;
  criadoPor: string | null;
  exposicoes: Exposicao[];
  excecoes: { femea: { id: string; brinco: string }; motivo: string }[];
}

export interface AbrirEstacao {
  touroId: string;
  pastoId: string;
  dataEntrada: string;
  femeaIds: string[];
  excecoes: { femeaId: string; motivo: string }[];
}

// --- Estações de monta -------------------------------------------------------

export async function listarEstacoes(situacao?: 'ABERTA' | 'ENCERRADA') {
  const resposta = await apiClient.get<EstacaoResumo[]>('/reproducao/estacoes', {
    params: { situacao },
  });
  return resposta.data;
}

export async function listarFemeasAptas(filtro: { pastoId?: string; categoria?: Categoria; data?: string }) {
  const resposta = await apiClient.get<FemeaApta[]>('/reproducao/estacoes/aptas', { params: filtro });
  return resposta.data;
}

export async function buscarEstacao(id: string) {
  const resposta = await apiClient.get<EstacaoDetalhe>(`/reproducao/estacoes/${id}`);
  return resposta.data;
}

export async function abrirEstacao(dados: AbrirEstacao) {
  const resposta = await apiClient.post<{ id: string; expostas: number; excecoes: number }>(
    '/reproducao/estacoes',
    dados,
  );
  return resposta.data;
}

export async function incluirFemeas(id: string, femeaIds: string[], dataInicio: string) {
  const resposta = await apiClient.post<{ incluidas: number }>(`/reproducao/estacoes/${id}/femeas`, {
    femeaIds,
    dataInicio,
  });
  return resposta.data;
}

export async function encerrarEstacao(id: string, dataSaida: string) {
  const resposta = await apiClient.post<EstacaoDetalhe>(`/reproducao/estacoes/${id}/encerrar`, {
    dataSaida,
  });
  return resposta.data;
}

export async function editarEstacao(id: string, dados: { dataEntrada?: string; dataSaida?: string }) {
  const resposta = await apiClient.patch<EstacaoDetalhe>(`/reproducao/estacoes/${id}`, dados);
  return resposta.data;
}

export async function cancelarEstacao(id: string, motivo: string) {
  await apiClient.post(`/reproducao/estacoes/${id}/cancelar`, { motivo });
}

export async function cancelarExposicao(id: string, motivo: string) {
  await apiClient.post(`/reproducao/exposicoes/${id}/cancelar`, { motivo });
}

// --- Diagnóstico de gestação -------------------------------------------------

export type ResultadoDiagnostico = 'PRENHE' | 'VAZIA' | 'PERDA';
export type MetodoDiagnostico = 'TOQUE' | 'ULTRASSOM';

export interface QuemFez {
  feitoPorTipo: 'USUARIO' | 'VETERINARIO';
  feitoPorUsuarioId?: string;
  feitoPorVeterinarioId?: string;
}

export interface FemeaDoGrupo {
  id: string;
  brinco: string;
  categoria: Categoria;
  statusReprodutivo: StatusReprodutivo;
  ultimoDiagnostico: { data: string; resultado: ResultadoDiagnostico } | null;
}

export interface SituacaoReprodutiva {
  aplicavel: boolean;
  statusReprodutivo?: StatusReprodutivo;
  apta?: boolean;
  motivoInaptidao?: string | null;
  aptaEm?: string | null;
  expostaA?: { estacaoId: string; touroBrinco: string | null; pasto: string | null; desde: string }[];
  inseminacaoPendente?: { data: string; tipo: 'IA' | 'IATF'; semen: string | null } | null;
  ultimoDiagnostico?: {
    id: string;
    data: string;
    resultado: ResultadoDiagnostico;
    idadeGestacionalDias: number | null;
  } | null;
  ultimoParto?: string | null;
  previsaoParto?: { data: string; base: 'INSEMINACAO' | 'TOQUE' | 'ESTACAO' } | null;
}

export async function listarGrupoDiagnostico(filtro: { pastoId?: string; categoria?: Categoria }) {
  const resposta = await apiClient.get<FemeaDoGrupo[]>('/reproducao/diagnosticos/grupo', { params: filtro });
  return resposta.data;
}

export async function registrarDiagnostico(
  dados: QuemFez & {
    femeaId: string;
    data: string;
    resultado: 'PRENHE' | 'VAZIA';
    metodo: MetodoDiagnostico;
    idadeGestacionalDias?: number;
  },
) {
  const resposta = await apiClient.post('/reproducao/diagnosticos', dados);
  return resposta.data;
}

export async function registrarDiagnosticoLote(
  dados: QuemFez & {
    pastoId?: string;
    categoria?: Categoria;
    data: string;
    metodo: MetodoDiagnostico;
    resultados: { femeaId: string; resultado: 'PRENHE' | 'VAZIA'; idadeGestacionalDias?: number }[];
  },
) {
  const resposta = await apiClient.post<{ prenhes: number; vazias: number }>(
    '/reproducao/diagnosticos/lote',
    dados,
  );
  return resposta.data;
}

export async function registrarPerda(dados: { femeaId: string; data: string; motivo: string }) {
  const resposta = await apiClient.post('/reproducao/perdas', dados);
  return resposta.data;
}

export async function cancelarDiagnostico(id: string, motivo: string) {
  await apiClient.post(`/reproducao/diagnosticos/${id}/cancelar`, { motivo });
}

export async function buscarSituacaoReprodutiva(animalId: string) {
  const resposta = await apiClient.get<SituacaoReprodutiva>(`/reproducao/animais/${animalId}/situacao`);
  return resposta.data;
}

// Prévia do pai antes de registrar o parto (mesma regra do parto)
export async function buscarCandidatosPai(maeId: string, data: string) {
  const resposta = await apiClient.get<{
    touros: { id: string; brinco: string | null }[];
    semens: { id: string; nomeTouro: string | null }[];
  }>(`/reproducao/animais/${maeId}/candidatos-pai`, { params: { data } });
  return resposta.data;
}

// --- Sêmen e inseminação (US5) ----------------------------------------------

export type TipoInseminacao = 'IA' | 'IATF';

export interface Semen {
  id: string;
  nomeTouro: string;
  raca: { id: string; nome: string } | null;
  central: string | null;
  doses: number;
}

export interface Aplicacao {
  aplicadoPorTipo: 'USUARIO' | 'VETERINARIO';
  aplicadoPorUsuarioId?: string;
  aplicadoPorVeterinarioId?: string;
}

export interface InseminacaoRegistro {
  id: string;
  data: string;
  tipo: TipoInseminacao;
  femea: { id: string; brinco: string };
  semen: { id: string; nomeTouro: string };
  aplicadoPorUsuario: { nome: string } | null;
  aplicadoPorVeterinario: { nome: string } | null;
  cancelamento: Cancelamento;
}

export async function listarSemens() {
  const resposta = await apiClient.get<Semen[]>('/reproducao/semens');
  return resposta.data;
}

export async function cadastrarSemen(dados: { nomeTouro: string; racaId?: string; central?: string; doses: number }) {
  const resposta = await apiClient.post<Semen>('/reproducao/semens', dados);
  return resposta.data;
}

export async function entradaDoses(id: string, doses: number) {
  const resposta = await apiClient.post<Semen>(`/reproducao/semens/${id}/entrada`, { doses });
  return resposta.data;
}

export async function excluirSemen(id: string) {
  await apiClient.delete(`/reproducao/semens/${id}`);
}

export async function listarInseminacoes(femeaId?: string) {
  const resposta = await apiClient.get<InseminacaoRegistro[]>('/reproducao/inseminacoes', {
    params: { femeaId },
  });
  return resposta.data;
}

export async function registrarInseminacao(
  dados: Aplicacao & { femeaId: string; data: string; tipo: TipoInseminacao; semenId: string },
) {
  const resposta = await apiClient.post('/reproducao/inseminacoes', dados);
  return resposta.data;
}

export async function cancelarInseminacao(id: string, motivo: string) {
  await apiClient.post(`/reproducao/inseminacoes/${id}/cancelar`, { motivo });
}

// --- Histórico reprodutivo (FR-023) ------------------------------------------

interface EventoBase {
  id: string;
  data: string;
  cancelado: boolean;
  motivoCancelamento: string | null;
}

export type EventoReprodutivo = EventoBase &
  (
    | {
        tipo: 'EXPOSICAO';
        estacaoId: string;
        touroBrinco: string | null;
        pasto: string | null;
        dataFim: string | null;
        motivoFim: MotivoFimExposicao | null;
      }
    | { tipo: 'INSEMINACAO'; tipoInseminacao: TipoInseminacao; semen: string | null }
    | {
        tipo: 'DIAGNOSTICO';
        resultado: ResultadoDiagnostico;
        metodo: MetodoDiagnostico | null;
        idadeGestacionalDias: number | null;
      }
    | { tipo: 'PERDA'; motivo: string | null }
    | { tipo: 'PARTO'; resultado: 'VIVO' | 'NATIMORTO'; tipoParto: string }
  );

export async function buscarHistoricoReprodutivo(animalId: string) {
  const resposta = await apiClient.get<EventoReprodutivo[]>(`/reproducao/animais/${animalId}/historico`);
  return resposta.data;
}
