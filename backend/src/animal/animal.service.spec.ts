import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { AnimalService } from './animal.service';
import { Animal, CategoriaAnimal, OrigemAnimal, Sexo } from './entities/animal.entity';

describe('AnimalService', () => {
  let service: AnimalService;

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnimalService,
        { provide: getRepositoryToken(Animal), useValue: mockRepository },
      ],
    }).compile();

    service = module.get<AnimalService>(AnimalService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validacao sexo x categoria na criacao', () => {
    const fazendaId = 'fazenda-1';
    const baseDto = {
      brinco: '1',
      origem: OrigemAnimal.COMPRADO,
      dataNascimento: '2024-01-01',
      dataCompra: '2024-02-01',
    };

    beforeEach(() => {
      mockRepository.findOneBy.mockResolvedValue(null); // brinco disponivel
      mockRepository.create.mockImplementation((entrada) => entrada);
      mockRepository.save.mockImplementation((entrada) => Promise.resolve(entrada));
    });

    it('aceita femea como NOVILHA', async () => {
      await expect(
        service.create(fazendaId, { ...baseDto, sexo: Sexo.F, categoria: CategoriaAnimal.NOVILHA } as any),
      ).resolves.toBeDefined();
    });

    it('aceita femea como MATRIZ', async () => {
      await expect(
        service.create(fazendaId, { ...baseDto, sexo: Sexo.F, categoria: CategoriaAnimal.MATRIZ } as any),
      ).resolves.toBeDefined();
    });

    it('rejeita femea como TOURO', async () => {
      await expect(
        service.create(fazendaId, { ...baseDto, sexo: Sexo.F, categoria: CategoriaAnimal.TOURO } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejeita femea como BEZERRO', async () => {
      await expect(
        service.create(fazendaId, { ...baseDto, sexo: Sexo.F, categoria: CategoriaAnimal.BEZERRO } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it.each([
      CategoriaAnimal.BEZERRO,
      CategoriaAnimal.GARROTE,
      CategoriaAnimal.BOI,
      CategoriaAnimal.TOURO,
    ])('aceita macho como %s', async (categoria) => {
      await expect(
        service.create(fazendaId, { ...baseDto, sexo: Sexo.M, categoria } as any),
      ).resolves.toBeDefined();
    });

    it('rejeita macho como MATRIZ', async () => {
      await expect(
        service.create(fazendaId, { ...baseDto, sexo: Sexo.M, categoria: CategoriaAnimal.MATRIZ } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejeita macho como NOVILHA', async () => {
      await expect(
        service.create(fazendaId, { ...baseDto, sexo: Sexo.M, categoria: CategoriaAnimal.NOVILHA } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('validacao sexo x categoria na atualizacao', () => {
    const fazendaId = 'fazenda-1';
    const animalExistente = {
      id: 'animal-1',
      fazendaId,
      sexo: Sexo.F,
      categoria: CategoriaAnimal.NOVILHA,
      brinco: '1',
    };

    beforeEach(() => {
      mockRepository.findOne.mockResolvedValue(animalExistente);
      mockRepository.save.mockImplementation((entrada) => Promise.resolve(entrada));
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