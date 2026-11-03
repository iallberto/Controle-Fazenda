// Ganho médio diário (kg/dia) entre cada pesagem e a anterior.
// Espera as pesagens em ordem crescente de data; a primeira não tem GMD.
export function calcularGmd<T extends { data: string; pesoKg: number | string }>(pesagens: T[]) {
  return pesagens.map((pesagem, indice) => {
    if (indice === 0) {
      return { ...pesagem, gmdDesdeAnterior: null as number | null };
    }
    const anterior = pesagens[indice - 1];
    const dias =
      (new Date(pesagem.data).getTime() - new Date(anterior.data).getTime()) /
      (1000 * 60 * 60 * 24);
    const ganho = Number(pesagem.pesoKg) - Number(anterior.pesoKg);
    const gmd = dias > 0 ? Number((ganho / dias).toFixed(2)) : null;
    return { ...pesagem, gmdDesdeAnterior: gmd };
  });
}
