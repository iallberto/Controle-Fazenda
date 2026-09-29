import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RelatorioService } from './relatorio.service';
import { Animal } from '../animal/entities/animal.entity';
import { Parto } from '../parto/entities/parto.entity';
import { Tratamento } from '../tratamento/entities/tratamento.entity';

describe('RelatorioService', () => {
  let service: RelatorioService;

  const mockRepository = {
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RelatorioService,
        { provide: getRepositoryToken(Animal), useValue: mockRepository },
        { provide: getRepositoryToken(Parto), useValue: mockRepository },
        { provide: getRepositoryToken(Tratamento), useValue: mockRepository },
      ],
    }).compile();

    service = module.get<RelatorioService>(RelatorioService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});