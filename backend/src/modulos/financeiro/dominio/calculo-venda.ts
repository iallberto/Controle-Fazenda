// Cálculo da venda de animais (spec 003, FR-012; research R5). Tudo em
// números inteiros (centavos e centésimos de arroba) para a conta fechar exata.

// Usado quando a fazenda não configurou o peso da arroba da categoria
export const KG_POR_ARROBA_PADRAO = 15;

export type FormaPreco = 'POR_ARROBA' | 'VALOR_TOTAL';

export interface ItemParaCalculo {
  pesoKg: number | null;
  kgPorArroba: number | null;
}

export interface DadosVenda {
  forma: FormaPreco;
  precoArrobaCentavos?: number | null;
  valorTotalCentavos?: number | null;
  itens: ItemParaCalculo[];
}

export interface ResultadoVenda {
  itens: { arrobas: number | null; valorCentavos: number }[];
  arrobasTotal: number;
  valorTotalCentavos: number;
}

export class ErroCalculoVenda extends Error {}

// Arrobas em centésimos (30,17 @ = 3017), arredondadas a duas casas
function centesimosDeArroba(item: ItemParaCalculo): number | null {
  if (item.pesoKg === null || item.pesoKg === undefined) return null;
  const kg =
    item.kgPorArroba && item.kgPorArroba > 0
      ? item.kgPorArroba
      : KG_POR_ARROBA_PADRAO;
  return Math.round((item.pesoKg / kg) * 100);
}

export function calcularVenda(dados: DadosVenda): ResultadoVenda {
  if (dados.itens.length === 0) {
    throw new ErroCalculoVenda('Escolha ao menos um animal para vender');
  }
  const centesimos = dados.itens.map(centesimosDeArroba);
  const arrobasTotal =
    centesimos.reduce<number>((soma, c) => soma + (c ?? 0), 0) / 100;

  if (dados.forma === 'POR_ARROBA') {
    const preco = dados.precoArrobaCentavos ?? 0;
    if (preco <= 0) throw new ErroCalculoVenda('Informe o preço da arroba');
    if (centesimos.some((c) => c === null)) {
      throw new ErroCalculoVenda(
        'Na venda por arroba, informe o peso de todos os animais',
      );
    }
    const itens = centesimos.map((c) => ({
      arrobas: c! / 100,
      valorCentavos: Math.round((c! * preco) / 100),
    }));
    return {
      itens,
      arrobasTotal,
      valorTotalCentavos: itens.reduce((soma, i) => soma + i.valorCentavos, 0),
    };
  }

  const total = dados.valorTotalCentavos ?? 0;
  if (total <= 0) throw new ErroCalculoVenda('Informe o valor total da venda');
  const todosComPeso = dados.itens.every(
    (i) => i.pesoKg !== null && i.pesoKg > 0,
  );
  const pesos = dados.itens.map((i) => (todosComPeso ? i.pesoKg! : 1));
  const somaPesos = pesos.reduce((a, b) => a + b, 0);

  // Partes proporcionais ao peso (ou iguais), arredondadas para baixo; a sobra
  // vai para o último animal, para a soma bater exatamente com o total
  const valores = pesos.map((peso) => Math.floor((total * peso) / somaPesos));
  const distribuido = valores.reduce((a, b) => a + b, 0);
  valores[valores.length - 1] += total - distribuido;

  return {
    itens: valores.map((valorCentavos, i) => ({
      arrobas: centesimos[i] === null ? null : centesimos[i]! / 100,
      valorCentavos,
    })),
    arrobasTotal,
    valorTotalCentavos: total,
  };
}

// Preço médio da arroba: soma dos valores ÷ soma das arrobas, só dos animais
// com peso (FR-019). Em centavos; null sem nenhuma arroba.
export function precoMedioArroba(
  itens: { arrobas: number | null; valorCentavos: number }[],
): number | null {
  let centesimos = 0;
  let valor = 0;
  for (const item of itens) {
    if (item.arrobas === null) continue;
    centesimos += Math.round(item.arrobas * 100);
    valor += item.valorCentavos;
  }
  if (centesimos === 0) return null;
  return Math.round((valor * 100) / centesimos);
}
