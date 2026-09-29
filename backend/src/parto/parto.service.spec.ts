import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PartoService } from './parto.service';
import { Parto } from './entities/parto.entity';
import { Animal } from '../animal/entities/animal.entity';

describe('PartoService', () => {
  let service: PartoService;

  const mockPartoRepository = {
    find: jest.fn(),
    findOneBy: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    manager: { transaction: jest.fn() },
  };

  const mockAnimalRepository = {
    find: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
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
});