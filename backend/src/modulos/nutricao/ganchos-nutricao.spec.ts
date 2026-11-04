import { ganchosRebanho } from '../../common/ganchos-rebanho';
import { GanchosNutricao } from './ganchos-nutricao';

describe('GanchosNutricao (spec 005, FR-010b)', () => {
  const manager = { findOne: jest.fn(), save: jest.fn() };
  const ganchos = new GanchosNutricao();
  const saida = { fazendaId: 'f1', animalId: 'a1', data: '2026-11-04', usuarioId: 'u1' };

  beforeEach(() => {
    jest.resetAllMocks();
    ganchosRebanho.limpar();
  });

  it('a saída do rebanho fecha a participação aberta no lote na data', async () => {
    const membro = { animalId: 'a1', entrada: '2026-10-01', saida: null as string | null, retiradoPorId: null };
    manager.findOne.mockResolvedValue(membro);
    ganchos.onModuleInit();
    await ganchosRebanho.emitir('saidaDoRebanho', manager as never, saida);
    expect(membro).toMatchObject({ saida: '2026-11-04', retiradoPorId: 'u1' });
    expect(manager.save).toHaveBeenCalledWith(membro);
  });

  it('animal sem lote: nada', async () => {
    manager.findOne.mockResolvedValue(null);
    await ganchos.aoSairDoRebanho(manager as never, saida);
    expect(manager.save).not.toHaveBeenCalled();
  });
});
