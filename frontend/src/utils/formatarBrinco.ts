export function formatarBrinco(valor: string | number): string {
  const texto = String(valor).trim();
  return /^\d+$/.test(texto) ? `#${texto.padStart(4, '0')}` : `#${texto}`;
}