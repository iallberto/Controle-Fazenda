import { BadRequestException, ConflictException } from '@nestjs/common';
import { ComprasService } from './compras.service';
import { CompraAnimal } from './entities/compra-animal.entity';
import { TipoLancamento } from './entities/categoria-financeira.entity';
import { OrigemLancamento } from './entities/lancamento.entity';
import { OrigemAnimal } from '../../animal/entities/animal.entity';

describe('ComprasService (FR-016b, FR-016c)', () => {
  const manager = {
    create: jest.fn((_e: unknown, dados: object) => dados),
    save: jest.fn(async (dados: object) => ({ id: 'compra-1', ...dados })),
    update: jest.fn(),
  };
  const compraRepo = {
    existsBy: jest.fn(),
    manager: { transaction: jest.fn() },
  };
  const qb = {
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };
  const animalRepo = {
    findOneBy: jest.fn(),
    createQueryBuilder: jest.fn(() => qb),
  };
  const moduloRepo = { findOne: jest.fn() };
  const animalService = { create: jest.fn() };
  const categorias = { porCodigo: jest.fn(async () => ({ id: 'cat-compra' })) };
  const lancamentos = {
    lancarNaTransacao: jest.fn(async () => ({ id: 'lanc-1' })),
  };
  const service = new ComprasService(
    compraRepo as never,
    animalRepo as never,
    moduloRepo as never,
    animalService as never,
    categorias as never,
    lancamentos as never,
  );

  const animal = {
    id: 'a1',
    fazendaId: 'f1',
    brinco: '25',
    origem: OrigemAnimal.COMPRADO,
    dataCompra: '2026-10-20',
    procedencia: 'Sítio Bom Jesus',
  };
  const dtoCompra = {
    codigoId: 'cod',
    sexo: 'M',
    categoria: 'GARROTE',
    origem: OrigemAnimal.COMPRADO,
    dataCompra: '2026-10-20',
    valorCentavos: 200000,
    vendedor: 'Zé do Gado',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    compraRepo.manager.transaction.mockImplementation(
      (cb: (m: typeof manager) => unknown) => cb(manager),
    );
    // Roda o callback do cadastro como faria o AnimalService, na mesma transação
    animalService.create.mockImplementation(
      async (
        _f: string,
        _u: string,
        _dto: object,
        depois: (m: unknown, a: unknown) => Promise<void>,
      ) => {
        await depois(manager, animal);
        return animal;
      },
    );
  });

  it('com valor: cria animal, compra e despesa na mesma transação do cadastro', async () => {
    await service.comprar('f1', 'dono', dtoCompra as never);

    const [, , dadosAnimal] = animalService.create.mock.calls[0];
    expect(dadosAnimal).not.toHaveProperty('valorCentavos');
    expect(manager.create).toHaveBeenCalledWith(
      CompraAnimal,
      expect.objectContaining({
        animalId: 'a1',
        valorCentavos: 200000,
        vendedor: 'Zé do Gado',
      }),
    );
    expect(lancamentos.lancarNaTransacao).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        tipo: TipoLancamento.DESPESA,
        data: '2026-10-20',
        valorCentavos: 200000,
        categoriaId: 'cat-compra',
        origem: OrigemLancamento.COMPRA,
        animalId: 'a1',
        compraId: 'compra-1',
      }),
    );
    expect(manager.update).toHaveBeenCalledWith(
      CompraAnimal,
      { id: 'compra-1' },
      { lancamentoId: 'lanc-1' },
    );
  });

  it('com 0,00: cria animal e compra, sem despesa', async () => {
    await service.comprar('f1', 'dono', {
      ...dtoCompra,
      valorCentavos: 0,
    } as never);
    expect(manager.create).toHaveBeenCalledWith(
      CompraAnimal,
      expect.objectContaining({ valorCentavos: 0 }),
    );
    expect(lancamentos.lancarNaTransacao).not.toHaveBeenCalled();
  });

  it('origem nascido na fazenda: 400', async () => {
    await expect(
      service.comprar('f1', 'dono', {
        ...dtoCompra,
        origem: OrigemAnimal.NASCIDO_FAZENDA,
      } as never),
    ).rejects.toThrow(BadRequestException);
  });

  it('compras sem valor: só depois da primeira liberação do Financeiro', async () => {
    moduloRepo.findOne.mockResolvedValue(null);
    expect(await service.semValor('f1')).toEqual([]);

    moduloRepo.findOne.mockResolvedValue({
      liberadoEm: new Date('2026-11-01T10:00:00Z'),
    });
    qb.getMany.mockResolvedValue([
      {
        ...animal,
        categoria: 'GARROTE',
        criadoPor: { nome: 'Peão' },
        criadoEm: new Date(),
      },
    ]);
    const lista = await service.semValor('f1');
    expect(lista).toEqual([
      expect.objectContaining({
        animalId: 'a1',
        brinco: '25',
        cadastradoPor: 'Peão',
      }),
    ]);
    expect(qb.andWhere).toHaveBeenCalledWith('usuario.papel = :papel', {
      papel: 'FUNCIONARIO',
    });
    expect(qb.andWhere).toHaveBeenCalledWith('compra.id IS NULL');
  });

  it('informar o valor de um pendente; animal já com compra: 409', async () => {
    animalRepo.findOneBy.mockResolvedValue(animal);
    compraRepo.existsBy.mockResolvedValue(false);
    expect(
      await service.valorarPendente('f1', 'dono', 'a1', {
        valorCentavos: 150000,
      }),
    ).toEqual({
      registrada: true,
      lancada: true,
    });
    expect(manager.create).toHaveBeenCalledWith(
      CompraAnimal,
      expect.objectContaining({ vendedor: 'Sítio Bom Jesus' }),
    );

    compraRepo.existsBy.mockResolvedValue(true);
    await expect(
      service.valorarPendente('f1', 'dono', 'a1', { valorCentavos: 0 }),
    ).rejects.toThrow(ConflictException);
  });
});
