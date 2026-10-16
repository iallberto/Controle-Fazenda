import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CodigoIdentificacaoService } from './codigo-identificacao.service';
import { CodigoIdentificacao, StatusCodigo } from './entities/codigo-identificacao.entity';
import { Animal } from '../animal/entities/animal.entity';

describe('CodigoIdentificacaoService', () => {
  let service: CodigoIdentificacaoService;

  const mockManager = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockCodigoRepository = {
    find: jest.fn(),
    findOneBy: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    manager: { transaction: jest.fn((cb: any) => cb(mockManager)) },
  };

  const mockAnimalRepository = {
    findOneBy: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockCodigoRepository.manager.transaction = jest.fn((cb: any) => cb(mockManager));

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

  describe('gerarLote', () => {
    it('numera sequencialmente continuando do maior numero existente na fazenda', async () => {
      const fazendaId = 'fazenda-1';
      mockManager.findOne.mockResolvedValue({ numero: 5 }); // maior numero ja existente

      mockManager.create.mockImplementation((_entidade: any, entrada: any) => entrada);
      mockManager.save.mockImplementation((_entidade: any, entrada: any) =>
        Promise.resolve({ id: `id-${entrada.numero}`, ...entrada }),
      );

      const resultado = await service.gerarLote(fazendaId, { quantidade: 3 } as any);

      expect(resultado.map((c) => c.numero)).toEqual([6, 7, 8]);
    });

    it('comeca em 1 quando a fazenda ainda nao tem nenhum codigo', async () => {
      const fazendaId = 'fazenda-1';
      mockManager.findOne.mockResolvedValue(null);

      mockManager.create.mockImplementation((_entidade: any, entrada: any) => entrada);
      mockManager.save.mockImplementation((_entidade: any, entrada: any) =>
        Promise.resolve({ id: `id-${entrada.numero}`, ...entrada }),
      );

      const resultado = await service.gerarLote(fazendaId, { quantidade: 2 } as any);

      expect(resultado.map((c) => c.numero)).toEqual([1, 2]);
    });
  });

  describe('listarDisponiveis', () => {
    it('busca apenas codigos com status DISPONIVEL da fazenda', async () => {
      const fazendaId = 'fazenda-1';
      mockCodigoRepository.find.mockResolvedValue([{ numero: 1 }, { numero: 2 }]);

      const resultado = await service.listarDisponiveis(fazendaId);

      expect(mockCodigoRepository.find).toHaveBeenCalledWith({
        where: { fazendaId, status: StatusCodigo.DISPONIVEL },
        order: { numero: 'ASC' },
      });
      expect(resultado).toHaveLength(2);
    });
  });
});