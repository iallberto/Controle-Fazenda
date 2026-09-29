import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfiguracaoService } from './configuracao.service';
import { ConfiguracaoFazenda } from './entities/configuracao-fazenda.entity';
import { ValorArrobaCategoria } from './entities/valor-arroba-categoria.entity';

describe('ConfiguracaoService', () => {
  let service: ConfiguracaoService;

  const mockConfiguracaoRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockValorArrobaRepository = {
    find: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfiguracaoService,
        { provide: getRepositoryToken(ConfiguracaoFazenda), useValue: mockConfiguracaoRepository },
        { provide: getRepositoryToken(ValorArrobaCategoria), useValue: mockValorArrobaRepository },
      ],
    }).compile();

    service = module.get<ConfiguracaoService>(ConfiguracaoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});