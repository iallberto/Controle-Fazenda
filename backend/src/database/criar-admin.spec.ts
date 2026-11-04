import { senhaForte } from './criar-admin';

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
