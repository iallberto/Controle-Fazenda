import { apiClient } from './client';

// Módulos pagos da fazenda (spec 002, FR-013)
export type ModuloPago = 'LEITE' | 'FINANCEIRO' | 'NUTRICAO';
export type SituacaoModulo = 'ATIVO' | 'SO_CONSULTA' | 'NAO_CONTRATADO';

export interface ModuloDaFazenda {
  modulo: ModuloPago;
  situacao: SituacaoModulo;
  dataTermino: string | null;
  diasParaVencer: number | null;
}

// Endereço de cada módulo na tela: /modulos/leite, /modulos/financeiro...
export const ROTA_DO_MODULO: Record<ModuloPago, string> = {
  LEITE: 'leite',
  FINANCEIRO: 'financeiro',
  NUTRICAO: 'nutricao',
};

export function moduloDaRota(trecho: string | undefined): ModuloPago | null {
  const encontrado = (Object.keys(ROTA_DO_MODULO) as ModuloPago[]).find(
    (modulo) => ROTA_DO_MODULO[modulo] === trecho,
  );
  return encontrado ?? null;
}

export async function buscarModulos() {
  const resposta = await apiClient.get<ModuloDaFazenda[]>('/fazenda/modulos');
  return resposta.data;
}

