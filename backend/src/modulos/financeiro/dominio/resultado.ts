import { precoMedioArroba } from './calculo-venda';

// Agregações do resultado (spec 003, FR-017 a FR-019), puras para testar sem
// banco. Valores em centavos; meses no formato AAAA-MM.

export const MESES_PADRAO = 12;
export const MESES_MAXIMO = 36;

// Meses de "de" até "ate", inclusive
export function mesesDoPeriodo(de: string, ate: string): string[] {
  const meses: string[] = [];
  let [ano, mes] = de.split('-').map(Number);
  const [anoFim, mesFim] = ate.split('-').map(Number);
  while (ano < anoFim || (ano === anoFim && mes <= mesFim)) {
    meses.push(`${ano}-${String(mes).padStart(2, '0')}`);
    mes++;
    if (mes > 12) {
      mes = 1;
      ano++;
    }
  }
  return meses;
}

export function somarMeses(mes: string, quantidade: number) {
  const [ano, m] = mes.split('-').map(Number);
  const total = ano * 12 + (m - 1) + quantidade;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}

// Período pedido, com padrão (12 meses até o atual) e limite (36 meses)
export function normalizarPeriodo(
  mesAtual: string,
  de?: string,
  ate?: string,
): { de: string; ate: string } {
  const fim = ate ?? mesAtual;
  let inicio = de ?? somarMeses(fim, -(MESES_PADRAO - 1));
  if (inicio > fim) inicio = fim;
  if (mesesDoPeriodo(inicio, fim).length > MESES_MAXIMO) {
    inicio = somarMeses(fim, -(MESES_MAXIMO - 1));
  }
  return { de: inicio, ate: fim };
}

export interface TotalPorMes {
  mes: string;
  tipo: 'RECEITA' | 'DESPESA';
  totalCentavos: number;
}

// Receita, despesa e lucro de cada mês do período, inclusive meses sem nada
export function resultadoMensal(meses: string[], totais: TotalPorMes[]) {
  const porMes = meses.map((mes) => {
    const soma = (tipo: TotalPorMes['tipo']) =>
      totais
        .filter((t) => t.mes === mes && t.tipo === tipo)
        .reduce((a, t) => a + t.totalCentavos, 0);
    const receitaCentavos = soma('RECEITA');
    const despesaCentavos = soma('DESPESA');
    return {
      mes,
      receitaCentavos,
      despesaCentavos,
      lucroCentavos: receitaCentavos - despesaCentavos,
    };
  });
  const receitaCentavos = porMes.reduce((a, m) => a + m.receitaCentavos, 0);
  const despesaCentavos = porMes.reduce((a, m) => a + m.despesaCentavos, 0);
  return {
    meses: porMes,
    totais: {
      receitaCentavos,
      despesaCentavos,
      lucroCentavos: receitaCentavos - despesaCentavos,
    },
  };
}

// Despesas por categoria, do maior para o menor, com percentual de uma casa.
// A sobra do arredondamento vai para os maiores restos, para somar 100,0.
export function percentuaisPorCategoria(
  linhas: { categoria: string; valorCentavos: number }[],
) {
  const total = linhas.reduce((a, l) => a + l.valorCentavos, 0);
  const ordenadas = [...linhas]
    .filter((l) => l.valorCentavos > 0)
    .sort((a, b) => b.valorCentavos - a.valorCentavos);
  if (total === 0) return [];
  // Em décimos de ponto percentual: 1000 = 100,0%
  const exatos = ordenadas.map((l) => (l.valorCentavos * 1000) / total);
  const decimos = exatos.map(Math.floor);
  let sobra = 1000 - decimos.reduce((a, b) => a + b, 0);
  const porResto = exatos
    .map((v, i) => ({ i, resto: v - Math.floor(v) }))
    .sort((a, b) => b.resto - a.resto);
  for (const { i } of porResto) {
    if (sobra <= 0) break;
    decimos[i]++;
    sobra--;
  }
  return ordenadas.map((l, i) => ({
    categoria: l.categoria,
    valorCentavos: l.valorCentavos,
    percentual: decimos[i] / 10,
  }));
}

export interface ItemVendido {
  mes: string;
  categoria: string;
  arrobas: number | null;
  valorCentavos: number;
}

// Vendas do período: total, quantidade e valor por categoria animal e o preço
// médio da arroba por mês (só itens com peso)
export function resumoVendas(meses: string[], itens: ItemVendido[]) {
  const porCategoria = new Map<
    string,
    { animais: number; valorCentavos: number }
  >();
  for (const item of itens) {
    const atual = porCategoria.get(item.categoria) ?? {
      animais: 0,
      valorCentavos: 0,
    };
    atual.animais++;
    atual.valorCentavos += item.valorCentavos;
    porCategoria.set(item.categoria, atual);
  }
  return {
    totalCentavos: itens.reduce((a, i) => a + i.valorCentavos, 0),
    animais: itens.length,
    porCategoria: [...porCategoria.entries()]
      .map(([categoria, v]) => ({ categoria, ...v }))
      .sort((a, b) => b.valorCentavos - a.valorCentavos),
    arrobaPorMes: meses.map((mes) => {
      const doMes = itens.filter((i) => i.mes === mes);
      return {
        mes,
        precoMedioArrobaCentavos: precoMedioArroba(doMes),
        arrobas:
          Math.round(doMes.reduce((a, i) => a + (i.arrobas ?? 0), 0) * 100) /
          100,
      };
    }),
  };
}
