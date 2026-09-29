import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CodigoIdentificacaoService } from './codigo-identificacao.service';
import { CodigoIdentificacao } from './entities/codigo-identificacao.entity';
import { Animal } from '../animal/entities/animal.entity';

describe('CodigoIdentificacaoService', () => {
  let service: CodigoIdentificacaoService;

  const mockCodigoRepository = {
    find: jest.fn(),
    findOneBy: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    manager: { transaction: jest.fn() },
  };

  const mockAnimalRepository = {
    findOneBy: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CodigoIdentificacaoService,
        { provide: getRepositoryToken(CodigoIdentificacao), useValue: mockCodigoRepository },
        { provide: getRepositoryToken(Animal), useValue: mockAnimalRepository },
      ],
    }).compile();

    service = module.get<CodigoIdentificacaoService>(CodigoIdentificacaoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});