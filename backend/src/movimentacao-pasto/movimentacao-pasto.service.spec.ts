import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MovimentacaoPastoService } from './movimentacao-pasto.service';
import { MovimentacaoPasto } from './entities/movimentacao-pasto.entity';
import { Animal } from '../animal/entities/animal.entity';
import { Pasto } from '../pasto/entities/pasto.entity';

describe('MovimentacaoPastoService', () => {
  let service: MovimentacaoPastoService;

  const mockMovimentacaoRepository = {
    find: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    manager: { transaction: jest.fn() },
  };

  const mockAnimalRepository = {
    findOneBy: jest.fn(),
  };

  const mockPastoRepository = {
    findOneBy: jest.fn(),
  };

  beforeEach(async () => {
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
});