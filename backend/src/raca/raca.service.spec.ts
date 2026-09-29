import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RacaService } from './raca.service';
import { Raca } from './entities/raca.entity';

describe('RacaService', () => {
  let service: RacaService;

  const mockRepository = {
    find: jest.fn(),
    findBy: jest.fn(),
    findOneBy: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RacaService, { provide: getRepositoryToken(Raca), useValue: mockRepository }],
    }).compile();

    service = module.get<RacaService>(RacaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});