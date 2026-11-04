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

// Número como impresso na etiqueta do brinco, sem zeros à esquerda: "0240" → "240"
export function formatarNumeroEtiqueta(valor: string | number): string {
  const texto = String(valor).trim();
  return /^\d+$/.test(texto) ? String(Number(texto)) : texto;
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

// Idade a partir da data de nascimento (AAAA-MM-DD): "1 ano e 3 meses", "5 meses"
export function formatarIdade(dataNascimento: string | null | undefined, hoje = new Date()): string {
  if (!dataNascimento) return '';
  const [ano, mes, dia] = dataNascimento.slice(0, 10).split('-').map(Number);
  let meses = (hoje.getFullYear() - ano) * 12 + (hoje.getMonth() + 1 - mes);
  if (hoje.getDate() < dia) meses--;
  if (meses < 1) return 'menos de 1 mês';
  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  const textoAnos = anos === 1 ? '1 ano' : `${anos} anos`;
  const textoMeses = resto === 1 ? '1 mês' : `${resto} meses`;
  if (anos === 0) return textoMeses;
  return resto === 0 ? textoAnos : `${textoAnos} e ${textoMeses}`;
}

// Peso em kg no formato brasileiro: 412.5 → "412,5 kg"
export function formatarPeso(pesoKg: number | string): string {
  return `${Number(pesoKg).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg`;
}

// Peso vivo em arrobas, com o kg por arroba da categoria (Configurações).
// Sem configuração para a categoria, vale 15 kg, igual à página pública.
export function converterEmArrobas(pesoKg: number | string, kgPorArroba?: number | string | null) {
  const referencia = Number(kgPorArroba) || 15;
  return Math.round((Number(pesoKg) / referencia) * 10) / 10;
}

// Arrobas com uma casa decimal: 33.3 → "33,3 arrobas", 1 → "1 arroba"
export function formatarArrobas(arrobas: number): string {
  const texto = arrobas.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  return `${texto} ${arrobas === 1 ? 'arroba' : 'arrobas'}`;
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

export const formatarMotivoEncerramento = rotular({
  MANUAL: 'Encerrada',
  TOURO_SAIU_DO_PASTO: 'Encerrada: o touro saiu do pasto',
  TOURO_SAIU_DO_REBANHO: 'Encerrada: o touro saiu do rebanho',
});

export const formatarMotivoFimExposicao = rotular({
  ESTACAO_ENCERRADA: 'Fim da estação',
  SAIU_DO_PASTO: 'Saiu do pasto',
  SAIU_DO_REBANHO: 'Saiu do rebanho',
});

export const formatarResultadoDiagnostico = rotular({
  PRENHE: 'Prenhe',
  VAZIA: 'Vazia',
  PERDA: 'Perda de gestação',
});

export const formatarMetodoDiagnostico = rotular({
  TOQUE: 'Toque',
  ULTRASSOM: 'Ultrassom',
});

export const formatarBasePrevisao = rotular({
  INSEMINACAO: 'pela inseminação',
  TOQUE: 'estimada pelo toque',
  ESTACAO: 'estimada pela estação',
});

// Idade gestacional: o veterinário fala em meses e dias; o sistema guarda dias,
// contando 30 dias por mês (3 meses e 22 dias = 112 dias)
export const DIAS_POR_MES_GESTACAO = 30;

export function idadeGestacionalEmDias(meses: number, dias: number): number {
  return meses * DIAS_POR_MES_GESTACAO + dias;
}

export function formatarIdadeGestacional(totalDias: number | null | undefined): string {
  if (!totalDias) return '';
  const meses = Math.floor(totalDias / DIAS_POR_MES_GESTACAO);
  const dias = totalDias % DIAS_POR_MES_GESTACAO;
  const textoMeses = meses === 1 ? '1 mês' : `${meses} meses`;
  const textoDias = dias === 1 ? '1 dia' : `${dias} dias`;
  if (meses === 0) return textoDias;
  return dias === 0 ? textoMeses : `${textoMeses} e ${textoDias}`;
}

export const formatarStatusCodigo = rotular({
  DISPONIVEL: 'Disponível',
  VINCULADO: 'Vinculado',
  DESATIVADO: 'Desativado (brinco reemitido)',
});

// Módulos pagos (spec 002)
export const ROTULOS_MODULO = {
  LEITE: 'Leite',
  FINANCEIRO: 'Financeiro',
  NUTRICAO: 'Nutrição',
} as const;
export const formatarModulo = rotular(ROTULOS_MODULO);

export const formatarSituacaoModulo = rotular({
  ATIVO: 'Ativo',
  SO_CONSULTA: 'Só consulta',
  NAO_CONTRATADO: 'Não contratado',
});

// --- Dinheiro (Financeiro, spec 003) -----------------------------------------
// A API trabalha com centavos inteiros: R$ 1.250,00 = 125000.

const MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatarReais(centavos: number | null | undefined): string {
  if (centavos === null || centavos === undefined) return '';
  return MOEDA.format(centavos / 100);
}

// Texto digitado → centavos. Aceita "1250", "1.250,00", "1250,5" e "1250.50".
// Devolve null quando não dá para entender o número.
export function centavosDeTexto(texto: string): number | null {
  const limpo = texto.trim().replace(/^R\$\s*/, '');
  if (!limpo) return null;
  let normalizado: string;
  if (limpo.includes(',')) {
    normalizado = limpo.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(limpo)) {
    normalizado = limpo.replace(/\./g, '');
  } else {
    normalizado = limpo;
  }
  if (!/^\d+(\.\d{1,2})?$/.test(normalizado)) return null;
  return Math.round(Number(normalizado) * 100);
}

// Centavos → texto para preencher um campo de edição ("1250,00")
export function textoDeCentavos(centavos: number): string {
  return (centavos / 100).toFixed(2).replace('.', ',');
}
