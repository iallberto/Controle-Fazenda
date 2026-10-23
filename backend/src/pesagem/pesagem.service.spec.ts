import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { PesagemService } from './pesagem.service';
import { Pesagem } from './entities/pesagem.entity';
import { Animal } from '../animal/entities/animal.entity';

describe('PesagemService', () => {
  let service: PesagemService;

  const mockPesagemRepository = {
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockAnimalRepository = {
    findOneBy: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PesagemService,
        { provide: getRepositoryToken(Pesagem), useValue: mockPesagemRepository },
        { provide: getRepositoryToken(Animal), useValue: mockAnimalRepository },
      ],
    }).compile();

    service = module.get<PesagemService>(PesagemService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const fazendaId = 'fazenda-1';
    const usuarioLogadoId = 'usuario-logado-1';

    it('usa o usuario logado como pesadoPor quando nao informado', async () => {
      mockAnimalRepository.findOneBy.mockResolvedValue({ id: 'animal-1', fazendaId });
      mockPesagemRepository.create.mockImplementation((entrada) => entrada);
      mockPesagemRepository.save.mockImplementation((entrada) => Promise.resolve(entrada));

      const dto = { animalId: 'animal-1', pesoKg: 150, data: '2026-01-10' };
      const resultado = await service.create(fazendaId, usuarioLogadoId, dto as any);

      expect(resultado.pesadoPorId).toBe(usuarioLogadoId);
      expect(resultado.lancadoPorId).toBe(usuarioLogadoId);
    });

    it('rejeita quando o animal nao pertence a fazenda', async () => {
      mockAnimalRepository.findOneBy.mockResolvedValue({ id: 'animal-1', fazendaId: 'outra-fazenda' });

      const dto = { animalId: 'animal-1', pesoKg: 150, data: '2026-01-10' };

      await expect(service.create(fazendaId, usuarioLogadoId, dto as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllPorAnimal', () => {
    it('calcula o GMD entre pesagens consecutivas', async () => {
      const fazendaId = 'fazenda-1';
      mockAnimalRepository.findOneBy.mockResolvedValue({ id: 'animal-1', fazendaId });
      mockPesagemRepository.find.mockResolvedValue([
        { id: 'p1', animalId: 'animal-1', pesoKg: 100, data: '2026-01-01' },
        { id: 'p2', animalId: 'animal-1', pesoKg: 130, data: '2026-01-11' },
      ]);

      const resultado = await service.findAllPorAnimal(fazendaId, 'animal-1');

      expect(resultado[0].gmdDesdeAnterior).toBeNull();
      expect(resultado[1].gmdDesdeAnterior).toBe(3);
    });
  });
});