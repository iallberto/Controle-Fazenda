import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PartoService } from './parto.service';
import { Parto, ResultadoParto, TipoParto } from './entities/parto.entity';
import { Animal, CategoriaAnimal, Sexo } from '../animal/entities/animal.entity';

describe('PartoService', () => {
  let service: PartoService;

  const mockManager = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockPartoRepository = {
    find: jest.fn(),
    findOneBy: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    manager: { transaction: jest.fn((cb: any) => cb(mockManager)) },
  };

  const mockAnimalRepository = {
    find: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPartoRepository.manager.transaction = jest.fn((cb: any) => cb(mockManager));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartoService,
        { provide: getRepositoryToken(Parto), useValue: mockPartoRepository },
        { provide: getRepositoryToken(Animal), useValue: mockAnimalRepository },
      ],
    }).compile();

    service = module.get<PartoService>(PartoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const fazendaId = 'fazenda-1';
    const matriz = {
      id: 'matriz-1',
      fazendaId,
      categoria: CategoriaAnimal.MATRIZ,
      racaId: 'raca-1',
    };

    it('rejeita parto se a mae nao for MATRIZ', async () => {
      mockAnimalRepository.findOneBy.mockResolvedValue({
        ...matriz,
        categoria: CategoriaAnimal.NOVILHA,
      });

      const dto = {
        maeId: 'matriz-1',
        data: '2026-01-01',
        tipo: TipoParto.NORMAL,
        resultado: ResultadoParto.VIVO,
        crias: [{ brinco: '1', sexo: Sexo.F }],
      };

      await expect(service.create(fazendaId, dto as any)).rejects.toThrow(BadRequestException);
    });

    it('rejeita parto se a mae nao existir', async () => {
      mockAnimalRepository.findOneBy.mockResolvedValue(null);

      const dto = {
        maeId: 'inexistente',
        data: '2026-01-01',
        tipo: TipoParto.NORMAL,
        resultado: ResultadoParto.NATIMORTO,
      };

      await expect(service.create(fazendaId, dto as any)).rejects.toThrow(NotFoundException);
    });

    it('cria a cria femea como NOVILHA', async () => {
      mockAnimalRepository.findOneBy.mockImplementation((criterio: any) =>
      criterio.id === matriz.id ? Promise.resolve(matriz) : Promise.resolve(null),
      );
      mockManager.create.mockImplementation((_entidade: any, entrada: any) => entrada);
      mockManager.save.mockImplementation((_entidade: any, entrada: any) =>
        Promise.resolve({ id: 'novo-id', ...entrada }),
      );
      mockManager.findOne.mockResolvedValue({ id: 'parto-1', crias: [] });

      const dto = {
        maeId: 'matriz-1',
        data: '2026-01-01',
        tipo: TipoParto.NORMAL,
        resultado: ResultadoParto.VIVO,
        crias: [{ brinco: '1', sexo: Sexo.F }],
      };

      await service.create(fazendaId, dto as any);

      const chamadasDeAnimal = mockManager.create.mock.calls.filter(
        (chamada) => chamada[0] === Animal,
      );
      expect(chamadasDeAnimal[0][1].categoria).toBe(CategoriaAnimal.NOVILHA);
    });

    it('cria a cria macho como BEZERRO', async () => {
      mockAnimalRepository.findOneBy.mockImplementation((criterio: any) =>
      criterio.id === matriz.id ? Promise.resolve(matriz) : Promise.resolve(null),
      );
      mockManager.create.mockImplementation((_entidade: any, entrada: any) => entrada);
      mockManager.save.mockImplementation((_entidade: any, entrada: any) =>
        Promise.resolve({ id: 'novo-id', ...entrada }),
      );
      mockManager.findOne.mockResolvedValue({ id: 'parto-1', crias: [] });

      const dto = {
        maeId: 'matriz-1',
        data: '2026-01-01',
        tipo: TipoParto.NORMAL,
        resultado: ResultadoParto.VIVO,
        crias: [{ brinco: '2', sexo: Sexo.M }],
      };

      await service.create(fazendaId, dto as any);

      const chamadasDeAnimal = mockManager.create.mock.calls.filter(
        (chamada) => chamada[0] === Animal,
      );
      expect(chamadasDeAnimal[0][1].categoria).toBe(CategoriaAnimal.BEZERRO);
    });
  });
});