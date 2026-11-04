import { EntityManager } from 'typeorm';
import { encerrarExposicoesPorSaida } from './saida';
import {
  EstacaoMonta,
  MotivoEncerramento,
} from './entities/estacao-monta.entity';
import {
  ExposicaoMonta,
  MotivoFimExposicao,
} from './entities/exposicao-monta.entity';

describe('encerrarExposicoesPorSaida', () => {
  const manager = { find: jest.fn(), update: jest.fn() };
  const comoManager = manager as unknown as EntityManager;

  // Estação e1 no pasto p1 (touro t1); a fêmea f1 está exposta desde 01/10
  const exposicaoF1 = {
    id: 'x1',
    femeaId: 'f1',
    dataInicio: '2026-10-01',
    estacao: { id: 'e1', pastoId: 'p1' },
  };
  const estacaoT1 = {
    id: 'e1',
    touroId: 't1',
    pastoId: 'p1',
    dataEntrada: '2026-10-01',
  };

  beforeEach(() => {
    jest.resetAllMocks();
    manager.find.mockImplementation(
      async (entidade: unknown, opcoes: { where: { estacaoId?: string } }) => {
        if (entidade === ExposicaoMonta && opcoes.where.estacaoId)
          return [{ id: 'x9', dataInicio: '2026-10-01' }];
        if (entidade === ExposicaoMonta) return [exposicaoF1];
        if (entidade === EstacaoMonta) return [];
        return [];
      },
    );
  });

  it('fêmea que muda para outro pasto tem a exposição encerrada como SAIU_DO_PASTO', async () => {
    await encerrarExposicoesPorSaida(comoManager, {
      animalIds: ['f1'],
      data: '2026-10-20',
      saida: 'PASTO',
      pastoDestinoId: 'p2',
      usuarioId: 'u1',
    });

    expect(manager.update).toHaveBeenCalledWith(
      ExposicaoMonta,
      { id: 'x1' },
      {
        dataFim: '2026-10-20',
        motivoFim: MotivoFimExposicao.SAIU_DO_PASTO,
        atualizadoPorId: 'u1',
      },
    );
  });

  it('fêmea movida para o mesmo pasto da estação continua exposta', async () => {
    await encerrarExposicoesPorSaida(comoManager, {
      animalIds: ['f1'],
      data: '2026-10-20',
      saida: 'PASTO',
      pastoDestinoId: 'p1',
      usuarioId: 'u1',
    });
    expect(manager.update).not.toHaveBeenCalled();
  });

  it('fêmea vendida ou morta sai como SAIU_DO_REBANHO', async () => {
    await encerrarExposicoesPorSaida(comoManager, {
      animalIds: ['f1'],
      data: '2026-10-20',
      saida: 'REBANHO',
      usuarioId: 'u1',
    });
    expect(manager.update).toHaveBeenCalledWith(
      ExposicaoMonta,
      { id: 'x1' },
      expect.objectContaining({
        motivoFim: MotivoFimExposicao.SAIU_DO_REBANHO,
      }),
    );
  });

  it('data de saída anterior ao início da exposição é ajustada para o início', async () => {
    await encerrarExposicoesPorSaida(comoManager, {
      animalIds: ['f1'],
      data: '2026-09-15',
      saida: 'REBANHO',
      usuarioId: 'u1',
    });
    expect(manager.update).toHaveBeenCalledWith(
      ExposicaoMonta,
      { id: 'x1' },
      expect.objectContaining({ dataFim: '2026-10-01' }),
    );
  });

  it('touro que sai do pasto encerra a estação e as exposições abertas dela', async () => {
    manager.find.mockImplementation(
      async (entidade: unknown, opcoes: { where: { estacaoId?: string } }) => {
        if (entidade === EstacaoMonta) return [estacaoT1];
        if (entidade === ExposicaoMonta && opcoes.where.estacaoId)
          return [{ id: 'x9', dataInicio: '2026-10-01' }];
        return [];
      },
    );

    await encerrarExposicoesPorSaida(comoManager, {
      animalIds: ['t1'],
      data: '2026-10-25',
      saida: 'PASTO',
      pastoDestinoId: 'p2',
      usuarioId: 'u1',
    });

    expect(manager.update).toHaveBeenCalledWith(
      EstacaoMonta,
      { id: 'e1' },
      {
        dataSaida: '2026-10-25',
        motivoEncerramento: MotivoEncerramento.TOURO_SAIU_DO_PASTO,
        atualizadoPorId: 'u1',
      },
    );
    expect(manager.update).toHaveBeenCalledWith(
      ExposicaoMonta,
      { id: 'x9' },
      expect.objectContaining({
        motivoFim: MotivoFimExposicao.ESTACAO_ENCERRADA,
      }),
    );
  });

  it('touro que sai do rebanho encerra a estação como TOURO_SAIU_DO_REBANHO', async () => {
    manager.find.mockImplementation(async (entidade: unknown) =>
      entidade === EstacaoMonta ? [estacaoT1] : [],
    );

    await encerrarExposicoesPorSaida(comoManager, {
      animalIds: ['t1'],
      data: '2026-10-25',
      saida: 'REBANHO',
      usuarioId: 'u1',
    });

    expect(manager.update).toHaveBeenCalledWith(
      EstacaoMonta,
      { id: 'e1' },
      expect.objectContaining({
        motivoEncerramento: MotivoEncerramento.TOURO_SAIU_DO_REBANHO,
      }),
    );
  });
});
