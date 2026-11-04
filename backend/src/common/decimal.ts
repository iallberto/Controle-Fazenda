import { ValueTransformer } from 'typeorm';

// Colunas decimal voltam do Postgres como texto; aqui viram número (litros,
// percentuais). Nulo continua nulo.
export const decimalParaNumero: ValueTransformer = {
  to: (valor: number | null | undefined) => valor,
  from: (valor: string | null) => (valor === null ? null : Number(valor)),
};
