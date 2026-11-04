import { motivoSenhaFraca, senhaForte } from './criar-admin';

describe('senhaForte (FR-018a)', () => {
  it.each([
    ['curta1', false],
    ['somenteletrasaqui', false],
    ['123456789012', false],
    ['SenhaForte12', true],
    ['uma senha longa 2026', true],
  ])('%s → %s', (senha, esperado) => {
    expect(senhaForte(senha)).toBe(esperado);
  });
});

describe('motivoSenhaFraca', () => {
  it('diz quantos caracteres chegaram e o que falta', () => {
    expect(motivoSenhaFraca('abc')).toBe(
      'A senha tem 3 caracteres e precisa de 12 ou mais, precisa de pelo menos um número.',
    );
    expect(motivoSenhaFraca('123456789012')).toBe(
      'A senha precisa de pelo menos uma letra.',
    );
    expect(motivoSenhaFraca('SenhaForte12')).toBeNull();
  });
});
