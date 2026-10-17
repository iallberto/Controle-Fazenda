import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AnimalService } from './animal.service';
import { Animal, CategoriaAnimal, OrigemAnimal, Sexo } from './entities/animal.entity';
import { CodigoIdentificacao, StatusCodigo } from '../codigo-identificacao/entities/codigo-identificacao.entity';

describe('AnimalService', () => {
  let service: AnimalService;

  const mockManager = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    manager: { transaction: jest.fn((cb: any) => cb(mockManager)) },
  };

  const mockCodigoRepository = {
    findOneBy: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRepository.manager.transaction = jest.fn((cb: any) => cb(mockManager));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnimalService,
        { provide: getRepositoryToken(Animal), useValue: mockRepository },
        { provide: getRepositoryToken(CodigoIdentificacao), useValue: mockCodigoRepository },
      ],
    }).compile();

    service = module.get<AnimalService>(AnimalService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const fazendaId = 'fazenda-1';
    const baseDto = {
      sexo: Sexo.F,
      categoria: CategoriaAnimal.NOVILHA,
      origem: OrigemAnimal.COMPRADO,
      dataNascimento: '2024-01-01',
      dataCompra: '2024-02-01',
      codigoId: 'codigo-1',
    };
    const codigoDisponivel = {
      id: 'codigo-1',
      fazendaId,
      numero: 7,
      status: StatusCodigo.DISPONIVEL,
    };

    it('usa o numero do codigo como brinco do animal', async () => {
      mockCodigoRepository.findOneBy.mockResolvedValue(codigoDisponivel);
      mockManager.create.mockImplementation((_entidade: any, entrada: any) => entrada);
      mockManager.save.mockImplementation((entrada: any) => Promise.resolve({ id: 'animal-1', ...entrada }));

      const resultado = await service.create(fazendaId, baseDto as any);

      expect(resultado.brinco).toBe('7');
    });

    it('rejeita quando o codigo nao existe', async () => {
      mockCodigoRepository.findOneBy.mockResolvedValue(null);

      await expect(service.create(fazendaId, baseDto as any)).rejects.toThrow(NotFoundException);
    });

    it('rejeita quando o codigo pertence a outra fazenda', async () => {
      mockCodigoRepository.findOneBy.mockResolvedValue({ ...codigoDisponivel, fazendaId: 'outra-fazenda' });

      await expect(service.create(fazendaId, baseDto as any)).rejects.toThrow(NotFoundException);
    });

    it('rejeita quando o codigo ja esta vinculado', async () => {
      mockCodigoRepository.findOneBy.mockResolvedValue({
        ...codigoDisponivel,
        status: StatusCodigo.VINCULADO,
      });

      await expect(service.create(fazendaId, baseDto as any)).rejects.toThrow(ConflictException);
    });
  });

  describe('validacao sexo x categoria na atualizacao', () => {
    const fazendaId = 'fazenda-1';
    const animalExistente = {
      id: 'animal-1',
      fazendaId,
      sexo: Sexo.F,
      categoria: CategoriaAnimal.NOVILHA,
      brinco: '7',
    };

    beforeEach(() => {
      mockRepository.findOne.mockResolvedValue(animalExistente);
      mockRepository.save.mockImplementation((entrada: any) => Promise.resolve(entrada));
    });

    it('aceita promover novilha para matriz', async () => {
      await expect(
        service.update(fazendaId, 'animal-1', { categoria: CategoriaAnimal.MATRIZ } as any),
      ).resolves.toBeDefined();
    });

    it('rejeita mudar categoria de femea para TOURO', async () => {
      await expect(
        service.update(fazendaId, 'animal-1', { categoria: CategoriaAnimal.TOURO } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('carrega o relacionamento mae junto do animal', async () => {
      const fazendaId = 'fazenda-1';
      const animalComMae = {
        id: 'animal-1',
        fazendaId,
        mae: { id: 'mae-1', brinco: '10' },
      };
      mockRepository.findOne.mockResolvedValue(animalComMae);

      const resultado = await service.findOne(fazendaId, 'animal-1');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'animal-1' },
        relations: { mae: true },
      });
      expect(resultado.mae?.brinco).toBe('10');
    });
  });
});