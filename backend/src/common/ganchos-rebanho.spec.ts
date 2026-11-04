import { EntityManager } from 'typeorm';
import { ganchosRebanho } from './ganchos-rebanho';

describe('ganchosRebanho (spec 004, R1)', () => {
  const manager = {} as EntityManager;
  const saida = {
    fazendaId: 'f1',
    animalId: 'a1',
    data: '2026-11-04',
    usuarioId: 'u1',
  };

  afterEach(() => ganchosRebanho.limpar());

  it('sem ganchos registrados, emitir não faz nada', async () => {
    await expect(
      ganchosRebanho.emitir('saidaDoRebanho', manager, saida),
    ).resolves.toBeUndefined();
  });

  it('chama os ganchos do evento, em ordem, com o manager e os dados', async () => {
    const chamadas: string[] = [];
    ganchosRebanho.registrar('saidaDoRebanho', async (m, dados) => {
      expect(m).toBe(manager);
      chamadas.push(`1:${dados.animalId}`);
    });
    ganchosRebanho.registrar('saidaDoRebanho', async () => {
      chamadas.push('2');
    });
    ganchosRebanho.registrar('partoRegistrado', async () => {
      chamadas.push('outro evento');
    });

    await ganchosRebanho.emitir('saidaDoRebanho', manager, saida);
    expect(chamadas).toEqual(['1:a1', '2']);
  });

  it('o erro de um gancho sobe e interrompe os seguintes', async () => {
    const depois = jest.fn();
    ganchosRebanho.registrar('saidaDoRebanho', async () => {
      throw new Error('recusado');
    });
    ganchosRebanho.registrar('saidaDoRebanho', depois);

    await expect(
      ganchosRebanho.emitir('saidaDoRebanho', manager, saida),
    ).rejects.toThrow('recusado');
    expect(depois).not.toHaveBeenCalled();
  });

  it('limpar remove os ganchos registrados', async () => {
    const gancho = jest.fn();
    ganchosRebanho.registrar('saidaDoRebanho', gancho);
    ganchosRebanho.limpar();
    await ganchosRebanho.emitir('saidaDoRebanho', manager, saida);
    expect(gancho).not.toHaveBeenCalled();
  });
});
