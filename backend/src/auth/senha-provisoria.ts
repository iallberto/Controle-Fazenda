import { randomInt } from 'crypto';

// Sem caracteres que se confundem ao ler em voz alta ou num papel: 0/O, 1/l/I
export const ALFABETO_SENHA_PROVISORIA = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const TAMANHO = 10;

// Senha provisória da redefinição pelo dono ou pelo administrador (spec 007,
// R6). Mostrada uma vez a quem redefiniu; o usuário troca no próximo login.
export function gerarSenhaProvisoria(): string {
  let senha = '';
  for (let i = 0; i < TAMANHO; i++) {
    senha += ALFABETO_SENHA_PROVISORIA[randomInt(ALFABETO_SENHA_PROVISORIA.length)];
  }
  return senha;
}
