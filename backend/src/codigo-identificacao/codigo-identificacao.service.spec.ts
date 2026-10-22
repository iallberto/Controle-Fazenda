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
    it('registra quem gerou cada codigo do lote', async () => {
      const fazendaId = 'fazenda-1';
      const usuarioLogadoId = 'usuario-logado-1';
      mockManager.findOne.mockResolvedValue(null);
      mockManager.create.mockImplementation((_entidade: any, entrada: any) => entrada);
      mockManager.save.mockImplementation((entrada: any) =>
        Promise.resolve({ id: `id-${entrada.numero}`, ...entrada }),
      );

      const resultado = await service.gerarLote(fazendaId, usuarioLogadoId, { quantidade: 2 } as any);

      expect(resultado.every((c) => c.criadoPorId === usuarioLogadoId)).toBe(true);
    });
  });
});