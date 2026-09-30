import { apiClient } from './client';

export interface ValorArroba {
  id: string;
  categoria: 'BEZERRO' | 'NOVILHA' | 'MATRIZ' | 'TOURO';
  pesoReferenciaKg: string;
}

export interface Configuracao {
  notificacoesAtivas: boolean;
  somAtivo: boolean;
  valoresArroba: ValorArroba[];
}

export async function obterConfiguracao(): Promise<Configuracao> {
  const resposta = await apiClient.get<Configuracao>('/configuracao');
  return resposta.data;
}

export async function atualizarPreferencias(dados: {
  notificacoesAtivas?: boolean;
  somAtivo?: boolean;
}) {
  const resposta = await apiClient.patch('/configuracao', dados);
  return resposta.data;
}

export async function atualizarValorArroba(categoria: string, pesoReferenciaKg: number) {
  const resposta = await apiClient.put(`/configuracao/arroba/${categoria}`, { pesoReferenciaKg });
  return resposta.data;
}