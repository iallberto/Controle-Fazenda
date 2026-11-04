// Módulos vendidos à parte (decisão D2). O pacote inicial, Reprodução e
// Rebanho, não entra aqui: está sempre disponível (FR-006).
export enum ModuloPago {
  LEITE = 'LEITE',
  FINANCEIRO = 'FINANCEIRO',
  NUTRICAO = 'NUTRICAO',
}

export const MODULOS_PAGOS: ModuloPago[] = [
  ModuloPago.LEITE,
  ModuloPago.FINANCEIRO,
  ModuloPago.NUTRICAO,
];

// ATIVO: contratado e vigente. SO_CONSULTA: já teve (desativado ou vencido) e
// só consulta os dados. NAO_CONTRATADO: nunca teve um período começado.
export type SituacaoModulo = 'ATIVO' | 'SO_CONSULTA' | 'NAO_CONTRATADO';
