// Data local no formato YYYY-MM-DD. toISOString() usa UTC e, no Brasil,
// vira o dia seguinte a partir das 21h.
export function formatarDataLocal(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export function hojeLocal(): string {
  return formatarDataLocal(new Date());
}
