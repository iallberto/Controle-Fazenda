// Formatadores de exibição: todo valor que vem cru da API (enum, data, número
// de brinco) passa por aqui antes de aparecer na tela.

// --- Brinco -----------------------------------------------------------------

// Números com 4 dígitos: 7 → "#0007". Brincos antigos não numéricos só ganham o "#".
export function formatarBrinco(valor: string | number): string {
  const texto = String(valor).trim();
  return /^\d+$/.test(texto) ? `#${texto.padStart(4, '0')}` : `#${texto}`;
}

// Versão com rótulo, para opções de select e textos corridos: "Brinco #0007"
export function rotuloBrinco(valor: string | number): string {
  return `Brinco ${formatarBrinco(valor)}`;
}

// --- Datas ------------------------------------------------------------------

// Datas "puras" (AAAA-MM-DD) são convertidas por texto, sem usar new Date().
// Com new Date('2026-10-27') o JavaScript assume UTC e, no Brasil, mostra o dia anterior.
export function formatarData(valor: string | null | undefined): string {
  if (!valor) return '';
  const [ano, mes, dia] = valor.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

// Momentos completos (criadoEm, reemitidoEm...) vêm em UTC e precisam do fuso local
export function formatarMomento(valor: string | null | undefined): string {
  if (!valor) return '';
  return new Date(valor).toLocaleDateString('pt-BR');
}

// --- Enums ------------------------------------------------------------------

function rotular<T extends string>(rotulos: Record<T, string>) {
  return (valor: T | string | null | undefined): string => {
    if (!valor) return '';
    return rotulos[valor as T] ?? valor;
  };
}

export const ROTULOS_SEXO = { F: 'Fêmea', M: 'Macho' } as const;
export const formatarSexo = rotular(ROTULOS_SEXO);

export const ROTULOS_CATEGORIA = {
  BEZERRO: 'Bezerro',
  NOVILHA: 'Novilha',
  MATRIZ: 'Matriz',
  GARROTE: 'Garrote',
  BOI: 'Boi',
  TOURO: 'Touro',
} as const;
export type Categoria = keyof typeof ROTULOS_CATEGORIA;
export const formatarCategoria = rotular(ROTULOS_CATEGORIA);

// Mesma regra do backend: cada sexo só aceita estas categorias
export const CATEGORIAS_POR_SEXO: Record<keyof typeof ROTULOS_SEXO, Categoria[]> = {
  F: ['NOVILHA', 'MATRIZ'],
  M: ['BEZERRO', 'GARROTE', 'BOI', 'TOURO'],
};

export const formatarStatusAnimal = rotular({
  ATIVO: 'Ativo',
  VENDIDO: 'Vendido',
  MORTO: 'Morto',
  DESCARTADO: 'Descartado',
});

export const formatarStatusReprodutivo = rotular({
  PRENHA: 'Prenha',
  LACTANTE: 'Lactante',
  VAZIA: 'Vazia',
});

export const formatarOrigem = rotular({
  NASCIDO_FAZENDA: 'Nascido na fazenda',
  COMPRADO: 'Comprado',
});

export const formatarTipoParto = rotular({
  NORMAL: 'Normal',
  ASSISTIDO: 'Assistido',
});

export const formatarResultadoParto = rotular({
  VIVO: 'Nascido vivo',
  NATIMORTO: 'Natimorto',
});

export const formatarPapel = rotular({
  DONO: 'Dono',
  FUNCIONARIO: 'Funcionário',
});

export const formatarStatusCodigo = rotular({
  DISPONIVEL: 'Disponível',
  VINCULADO: 'Vinculado',
  DESATIVADO: 'Desativado (brinco reemitido)',
});
