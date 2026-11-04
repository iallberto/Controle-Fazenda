import { somarDias } from '../../../reproducao/dominio/datas';
import { UnidadeBase } from '../entities/insumo.entity';

// Regras puras da Nutrição (spec 005), testadas sem banco.

const casas = (valor: number, n: number) => Math.round(valor * 10 ** n) / 10 ** n;

// Quantidade lançada → unidade base, com 3 casas (FR-004a; research R1)
export function paraBase(quantidade: number, fator: number): number {
  return casas(quantidade * fator, 3);
}

// Base → quantidade numa unidade, com 2 casas
export function daBase(quantidadeBase: number, fator: number): number {
  return casas(quantidadeBase / fator, 2);
}

// Unidades criadas junto com o insumo
export function unidadesPadrao(base: UnidadeBase): { nome: string; fator: number }[] {
  if (base === UnidadeBase.KG) {
    return [
      { nome: 'kg', fator: 1 },
      { nome: 'tonelada', fator: 1000 },
    ];
  }
  return [{ nome: base === UnidadeBase.LITRO ? 'litro' : 'unidade', fator: 1 }];
}

export type SituacaoEstoque = 'NORMAL' | 'BAIXO' | 'NEGATIVO';

// FR-007: negativo tem prioridade; abaixo do mínimo (ou zerado com mínimo) é baixo
export function situacaoEstoque(estoqueBase: number, minimoBase: number | null): SituacaoEstoque {
  if (estoqueBase < 0) return 'NEGATIVO';
  if (minimoBase !== null && estoqueBase < minimoBase) return 'BAIXO';
  return 'NORMAL';
}

// Animal no lote na data D: entrada ≤ D e (sem saída ou saída > D) (research R4)
export function noLoteNaData(
  membro: { entrada: string; saida: string | null },
  data: string,
): boolean {
  return membro.entrada <= data && (membro.saida === null || membro.saida > data);
}

// Sugestão do trato: quantidade por animal × animais, na unidade do item (FR-011)
export function sugestao(quantidadePorAnimal: number, animais: number): number {
  return casas(quantidadePorAnimal * animais, 2);
}

// Custo médio por unidade base na data (FR-021a; research R3): soma dos
// valores ÷ soma das bases das entradas com valor até a data; null sem preço
export function custoMedio(
  entradas: { data: string; quantidadeBase: number; valorCentavos: number | null }[],
  data: string,
): number | null {
  let valor = 0;
  let base = 0;
  for (const e of entradas) {
    if (e.valorCentavos === null || e.data > data) continue;
    valor += e.valorCentavos;
    base += e.quantidadeBase;
  }
  return base > 0 ? valor / base : null;
}

// Silo aberto: saldo, média dos últimos 7 dias com baixa e previsão (FR-019)
export function previsaoSilo(
  ensiladoKg: number,
  baixas: { data: string; quantidadeBase: number }[],
  hoje: string,
) {
  const porDia = new Map<string, number>();
  for (const b of baixas) porDia.set(b.data, (porDia.get(b.data) ?? 0) + b.quantidadeBase);
  const consumidoKg = [...porDia.values()].reduce((s, v) => s + v, 0);
  const saldoKg = casas(ensiladoKg - consumidoKg, 3);
  const ultimos = [...porDia.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 7)
    .map(([, v]) => v);
  const mediaKgDia = ultimos.length > 0 ? casas(ultimos.reduce((s, v) => s + v, 0) / ultimos.length, 3) : null;
  const dias = mediaKgDia && mediaKgDia > 0 && saldoKg > 0 ? Math.floor(saldoKg / mediaKgDia) : null;
  return {
    consumidoKg: casas(consumidoKg, 3),
    saldoKg,
    mediaKgDia,
    diasRestantes: dias,
    acabaEm: dias !== null ? somarDias(hoje, dias) : null,
  };
}

// Custo por animal por dia (FR-022): animais-dia contam um por dia com
// fornecimento no lote (dois tratos no mesmo dia não dobram); vale o maior
// número de animais do dia
export function custoPorAnimalDia(
  fornecimentos: { data: string; animais: number; custoCentavos: number }[],
) {
  const animaisPorDia = new Map<string, number>();
  let total = 0;
  for (const f of fornecimentos) {
    total += f.custoCentavos;
    animaisPorDia.set(f.data, Math.max(animaisPorDia.get(f.data) ?? 0, f.animais));
  }
  const animaisDia = [...animaisPorDia.values()].reduce((s, v) => s + v, 0);
  return {
    totalCentavos: Math.round(total),
    animaisDia,
    porAnimalDiaCentavos: animaisDia > 0 ? Math.round(total / animaisDia) : null,
  };
}

// Para comparar nomes (sem acento, sem maiúscula)
export function normalizarNome(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

