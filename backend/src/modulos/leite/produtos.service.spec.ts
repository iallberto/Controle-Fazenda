import { ConflictException, NotFoundException } from '@nestjs/common';
import { ProdutosService } from './produtos.service';
import { CarenciaLeite } from './entities/carencia-leite.entity';

describe('ProdutosService (spec 004, FR-015)', () => {
  const manager = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((_e: unknown, x: object) => ({ ...x })),
    save: jest.fn(async (x: object) => x),
    update: jest.fn(),
  };
  const service = new ProdutosService(manager as never);
  const existentes = [
    { id: 'p1', fazendaId: 'f1', nome: 'Antibiótico X', carenciaLeiteDias: 4, ativo: true },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    manager.find.mockResolvedValue(existentes);
  });

  it('cria o produto com a carência', async () => {
    await service.criar('f1', 'u1', { nome: 'Vermífugo', carenciaLeiteDias: 0 });
    expect(manager.save).toHaveBeenCalledWith(
      expect.objectContaining({ fazendaId: 'f1', nome: 'Vermífugo', carenciaLeiteDias: 0, criadoPorId: 'u1' }),
    );
  });

  it('nome repetido, sem acento e sem maiúscula → 409', async () => {
    await expect(
      service.criar('f1', 'u1', { nome: 'antibiotico x', carenciaLeiteDias: 3 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('desativa e muda a carência sem tocar nas carências já gravadas', async () => {
    manager.findOne.mockResolvedValue({ ...existentes[0] });
    const r = await service.editar('f1', 'u1', 'p1', { carenciaLeiteDias: 6, ativo: false });
    expect(r).toMatchObject({ carenciaLeiteDias: 6, ativo: false, atualizadoPorId: 'u1' });
    expect(manager.update).not.toHaveBeenCalledWith(CarenciaLeite, expect.anything(), expect.anything());
  });

  it('produto de outra fazenda → 404', async () => {
    manager.findOne.mockResolvedValue({ ...existentes[0], fazendaId: 'f2' });
    await expect(service.editar('f1', 'u1', 'p1', { ativo: false })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('lista só os ativos, a não ser que peça os inativos', async () => {
    await service.listar('f1');
    expect(manager.find).toHaveBeenCalledWith(expect.anything(), {
      where: { fazendaId: 'f1', ativo: true },
    });
    await service.listar('f1', true);
    expect(manager.find).toHaveBeenLastCalledWith(expect.anything(), {
      where: { fazendaId: 'f1' },
    });
  });
});
