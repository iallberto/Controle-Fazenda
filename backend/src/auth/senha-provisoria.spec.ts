import { ALFABETO_SENHA_PROVISORIA, gerarSenhaProvisoria } from './senha-provisoria';

describe('senha provisória (spec 007, R6)', () => {
  it('tem 10 caracteres, só do alfabeto sem 0, O, 1, l e I', () => {
    for (let i = 0; i < 200; i++) {
      const senha = gerarSenhaProvisoria();
      expect(senha).toHaveLength(10);
      expect([...senha].every((c) => ALFABETO_SENHA_PROVISORIA.includes(c))).toBe(true);
    }
    expect(ALFABETO_SENHA_PROVISORIA).not.toMatch(/[0O1lI]/);
  });

  it('não se repete', () => {
    const senhas = new Set(Array.from({ length: 500 }, () => gerarSenhaProvisoria()));
    expect(senhas.size).toBe(500);
  });
});
