import { SetMetadata } from '@nestjs/common';
import type { ModuloPago } from './modulo-pago';

export const MODULO_KEY = 'moduloPago';

// CONSULTA: ler dados. LANCAMENTO: criar, alterar ou cancelar.
export type TipoAcao = 'CONSULTA' | 'LANCAMENTO';

export interface MarcaModulo {
  modulo: ModuloPago;
  tipo?: TipoAcao;
}

// Marca um controller (ou um método) como parte de um módulo pago (FR-009).
// Sem o tipo, ele vem do método HTTP: GET é consulta, o resto é lançamento.
export const Modulo = (modulo: ModuloPago, tipo?: TipoAcao) =>
  SetMetadata<string, MarcaModulo>(MODULO_KEY, { modulo, tipo });
