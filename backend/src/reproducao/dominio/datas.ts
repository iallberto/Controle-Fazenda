// Aritmética com datas puras AAAA-MM-DD, sem fuso: as contas usam meio-dia UTC
// para nunca escorregar de dia por causa do horário de verão ou do fuso local.

function paraData(valor: string): Date {
  return new Date(`${valor.slice(0, 10)}T12:00:00Z`);
}

function paraTexto(data: Date): string {
  return data.toISOString().slice(0, 10);
}

export function diasEntre(inicio: string, fim: string): number {
  return Math.round(
    (paraData(fim).getTime() - paraData(inicio).getTime()) / 86_400_000,
  );
}

export function somarDias(data: string, dias: number): string {
  const resultado = paraData(data);
  resultado.setUTCDate(resultado.getUTCDate() + dias);
  return paraTexto(resultado);
}

export function maiorData(a: string, b: string): string {
  return a >= b ? a : b;
}

export function formatarDataBr(data: string): string {
  const [ano, mes, dia] = data.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}
