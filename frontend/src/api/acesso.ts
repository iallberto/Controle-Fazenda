import { apiClient } from './client';

export type SituacaoAcesso = 'SEM_PRAZO' | 'AGUARDANDO_IMPLANTACAO' | 'EM_DIA' | 'CARENCIA' | 'VENCIDO';

// Prazo de acesso da fazenda (spec 008). Valor, chave Pix e módulos só vêm para o dono.
export interface AcessoDaFazenda {
  situacao: SituacaoAcesso;
  acessoAte: string | null;
  diasRestantes: number | null;
  diasCarencia: number | null;
  podeLancar: boolean;
  mostrarPagamento: boolean;
  fazendaNome: string;
  emTeste: boolean;
  whatsappSuporte: string;
  valorCentavos?: number;
  pixChave?: string | null;
  modulosPlano?: string[];
}

export async function buscarAcesso(): Promise<AcessoDaFazenda> {
  return (await apiClient.get<AcessoDaFazenda>('/fazenda/acesso')).data;
}

// Link do WhatsApp com a mensagem pronta
export function linkWhatsapp(numero: string, mensagem: string) {
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}
