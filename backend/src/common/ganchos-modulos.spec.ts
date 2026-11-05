import { EntityManager } from 'typeorm';
import { ganchosModulos } from './ganchos-modulos';

describe('ganchosModulos (spec 006, R1)', () => {
  const manager = {} as EntityManager;
  const desfeito = { fazendaId: 'f1', recebimentoId: 'r1', motivo: 'x', usuarioId: 'u1' };

  afterEach(() => ganchosModulos.limpar());

  it('sem ouvinte, emitir não faz nada', async () => {
    await expect(ganchosModulos.emitir('leiteRecebimentoDesfeito', manager, desfeito)).resolves.toBeUndefined();
  });

  it('chama os ganchos do evento em ordem, com o manager', async () => {
    const chamadas: string[] = [];
    ganchosModulos.registrar('leiteRecebimentoDesfeito', async (m, d) => {
      expect(m).toBe(manager);
      chamadas.push(`1:${d.recebimentoId}`);
    });
    ganchosModulos.registrar('leiteRecebimentoDesfeito', async () => {
      chamadas.push('2');
    });
    ganchosModulos.registrar('nutricaoEntradaCancelada', async () => {
      chamadas.push('outro');
    });
    await ganchosModulos.emitir('leiteRecebimentoDesfeito', manager, desfeito);
    expect(chamadas).toEqual(['1:r1', '2']);
  });

  it('o erro de um gancho sobe e interrompe os seguintes; limpar remove', async () => {
    const depois = jest.fn();
    ganchosModulos.registrar('leiteRecebimentoDesfeito', async () => {
      throw new Error('falhou');
    });
    ganchosModulos.registrar('leiteRecebimentoDesfeito', depois);
    await expect(ganchosModulos.emitir('leiteRecebimentoDesfeito', manager, desfeito)).rejects.toThrow('falhou');
    expect(depois).not.toHaveBeenCalled();
    ganchosModulos.limpar();
    await ganchosModulos.emitir('leiteRecebimentoDesfeito', manager, desfeito);
    expect(depois).not.toHaveBeenCalled();
  });
});
