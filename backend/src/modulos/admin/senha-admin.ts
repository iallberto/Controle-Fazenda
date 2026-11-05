// Senha do administrador do sistema: 12 caracteres ou mais, com letras e
// números (spec 002, FR-018a; spec 007, FR-002). Usada pelo comando criar-admin
// e pela troca de senha no painel.
export function senhaForte(senha: string) {
  return motivoSenhaFraca(senha) === null;
}

// O que falta na senha, em português simples; null quando está boa
export function motivoSenhaFraca(senha: string): string | null {
  const faltas: string[] = [];
  if (senha.length < 12) {
    faltas.push(`tem ${senha.length} caracteres e precisa de 12 ou mais`);
  }
  if (!/[A-Za-z]/.test(senha)) faltas.push('precisa de pelo menos uma letra');
  if (!/\d/.test(senha)) faltas.push('precisa de pelo menos um número');
  return faltas.length ? `A senha ${faltas.join(', ')}.` : null;
}
