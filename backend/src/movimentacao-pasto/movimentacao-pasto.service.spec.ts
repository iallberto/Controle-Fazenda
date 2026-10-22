import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { MovimentacaoPastoService } from './movimentacao-pasto.service';
import { MovimentacaoPasto } from './entities/movimentacao-pasto.entity';
import { Animal } from '../animal/entities/animal.entity';
import { Pasto } from '../pasto/entities/pasto.entity';

describe('MovimentacaoPastoService', () => {
  let service: MovimentacaoPastoService;

  const mockManager = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockMovimentacaoRepository = {
    find: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    manager: { transaction: jest.fn((cb: any) => cb(mockManager)) },
  };

  const mockAnimalRepository = {
    findOneBy: jest.fn(),
  };

  const mockPastoRepository = {
    findOneBy: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockMovimentacaoRepository.manager.transaction = jest.fn((cb: any) => cb(mockManager));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MovimentacaoPastoService,
        { provide: getRepositoryToken(MovimentacaoPasto), useValue: mockMovimentacaoRepository },
        { provide: getRepositoryToken(Animal), useValue: mockAnimalRepository },
        { provide: getRepositoryToken(Pasto), useValue: mockPastoRepository },
      ],
    }).compile();

    service = module.get<MovimentacaoPastoService>(MovimentacaoPastoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('mover', () => {
    const fazendaId = 'fazenda-1';
    const usuarioLogadoId = 'usuario-logado-1';

    it('registra quem criou a movimentacao', async () => {
      mockAnimalRepository.findOneBy.mockResolvedValue({ id: 'animal-1', fazendaId });
      mockPastoRepository.findOneBy.mockResolvedValue({ id: 'pasto-1', fazendaId });
      mockManager.findOne.mockResolvedValue(null);
      mockManager.create.mockImplementation((_entidade: any, entrada: any) => entrada);
      mockManager.save.mockImplementation((entrada: any) => Promise.resolve({ id: 'mov-1', ...entrada }));

      const dto = { animalId: 'animal-1', pastoId: 'pasto-1', data: '2026-01-01' };
      const resultado = await service.mover(fazendaId, usuarioLogadoId, dto as any);

      expect(resultado.criadoPorId).toBe(usuarioLogadoId);
    });

    it('rejeita quando o animal nao existe', async () => {
      mockAnimalRepository.findOneBy.mockResolvedValue(null);

      const dto = { animalId: 'inexistente', pastoId: 'pasto-1', data: '2026-01-01' };

      await expect(service.mover(fazendaId, usuarioLogadoId, dto as any)).rejects.toThrow(NotFoundException);
    });
  });
});