import { registrarSaidaDoRebanho, voltarAoRebanho } from './saida-do-rebanho';
import { Animal, StatusAnimal } from './entities/animal.entity';
import { MovimentacaoPasto } from '../movimentacao-pasto/entities/movimentacao-pasto.entity';
import { ganchosRebanho } from '../common/ganchos-rebanho';

// Saída e volta ao rebanho (spec 003, research R2), usadas pela mudança de
// status e pela venda do Financeiro
describe('saída e volta ao rebanho', () => {
  const manager = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  };

  afterEach(() => ganchosRebanho.limpar());

  it('registrarSaidaDoRebanho avisa os ganchos do rebanho (spec 004, R1)', async () => {
    jest.resetAllMocks();
    manager.save.mockImplementation(async (x: unknown) => x);
    manager.find.mockResolvedValue([]);
    manager.update.mockResolvedValue({ affected: 0 });
    manager.findOne.mockResolvedValue(null);
    const gancho = jest.fn();
    ganchosRebanho.registrar('saidaDoRebanho', gancho);
    await registrarSaidaDoRebanho(manager as never, {
      animal: { id: 'a1', fazendaId: 'f1' } as Animal,
      status: StatusAnimal.MORTO,
      data: '2026-11-04',
      motivo: 'Morte',
      usuarioId: 'u1',
    });
    expect(gancho).toHaveBeenCalledWith(manager, {
      fazendaId: 'f1',
      animalId: 'a1',
      data: '2026-11-04',
      usuarioId: 'u1',
    });
  });

  beforeEach(() => {
    jest.resetAllMocks();
    manager.save.mockImplementation(async (x: unknown) => x);
    manager.create.mockImplementation((_e: unknown, dados: object) => dados);
    manager.find.mockResolvedValue([]);
    manager.update.mockResolvedValue({ affected: 0 });
  });

  it('registrarSaidaDoRebanho fecha a permanência, tira do pasto e marca o status', async () => {
    const permanencia = { id: 'm1', dataSaida: null as string | null };
    manager.findOne.mockResolvedValue(permanencia);
    const animal = {
      id: 'a1',
      status: StatusAnimal.ATIVO,
      pastoAtualId: 'p1',
    } as unknown as Animal;

    const salvo = await registrarSaidaDoRebanho(manager as never, {
      animal,
      status: StatusAnimal.VENDIDO,
      data: '2026-11-04',
      motivo: 'Venda para João',
      usuarioId: 'u1',
    });

    expect(permanencia.dataSaida).toBe('2026-11-04');
    expect(salvo).toMatchObject({
      status: StatusAnimal.VENDIDO,
      dataStatus: '2026-11-04',
      motivoStatus: 'Venda para João',
      pastoAtualId: null,
      atualizadoPorId: 'u1',
    });
    // Encerramento de exposições consultado para o animal
    expect(manager.find).toHaveBeenCalled();
  });

  it('voltarAoRebanho deixa o animal ativo e abre uma permanência nova no pasto', async () => {
    await voltarAoRebanho(manager as never, {
      animalId: 'a1',
      pastoId: 'p1',
      data: '2026-11-05',
      usuarioId: 'dono',
    });

    expect(manager.update).toHaveBeenCalledWith(
      Animal,
      { id: 'a1' },
      {
        status: StatusAnimal.ATIVO,
        motivoStatus: null,
        dataStatus: null,
        pastoAtualId: 'p1',
        atualizadoPorId: 'dono',
      },
    );
    expect(manager.create).toHaveBeenCalledWith(MovimentacaoPasto, {
      animalId: 'a1',
      pastoId: 'p1',
      dataEntrada: '2026-11-05',
      dataSaida: null,
      criadoPorId: 'dono',
    });
  });

  it('voltarAoRebanho sem pasto não cria permanência', async () => {
    await voltarAoRebanho(manager as never, {
      animalId: 'a1',
      pastoId: null,
      data: '2026-11-05',
      usuarioId: 'dono',
    });
    expect(manager.create).not.toHaveBeenCalled();
  });
});
