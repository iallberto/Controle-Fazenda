// Token emitido antes da última troca de senha não vale mais (spec 007, FR-005).
// O iat do JWT é em segundos; a comparação é no mesmo segundo para o token novo,
// emitido logo depois da troca, continuar valendo.
export function tokenAnteriorATroca(iat: number | undefined, senhaAlteradaEm: Date | null | undefined) {
  if (!senhaAlteradaEm || iat === undefined) return false;
  return iat < Math.floor(new Date(senhaAlteradaEm).getTime() / 1000);
}
