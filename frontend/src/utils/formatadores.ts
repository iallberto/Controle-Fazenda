// Datas "puras" (AAAA-MM-DD) são convertidas por texto, sem usar new Date().
// Com new Date('2026-10-27') o JavaScript assume UTC e, no Brasil, mostra o dia anterior.
export function formatarData(valor: string | null | undefined): string {
  if (!valor) return '';
  const [ano, mes, dia] = valor.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

export function formatarSexo(sexo: string): string {
  if (sexo === 'F') return 'Fêmea';
  if (sexo === 'M') return 'Macho';
  return sexo;
}