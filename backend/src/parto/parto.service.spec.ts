import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PartoService } from './parto.service';
import { Parto, ResultadoParto, TipoParto } from './entities/parto.entity';
import { MovimentacaoPasto } from '../movimentacao-pasto/entities/movimentacao-pasto.entity';
import { Animal, CategoriaAnimal, Sexo } from '../animal/entities/animal.entity';
import {
  CodigoIdentificacao,
  StatusCodigo,
} from '../codigo-identificacao/entities/codigo-identificacao.entity';

describe('PartoService', () => {
  let service: PartoService;

  const mockManager = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockPartoRepository = {
    find: jest.fn(),
    findOneBy: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    manager: { transaction: jest.fn((cb: any) => cb(mockManager)) },
  };

  const mockAnimalRepository = {
    find: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockCodigoRepository = {
    findOneBy: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPartoRepository.manager.transaction = jest.fn((cb: any) => cb(mockManager));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartoService,
        { provide: getRepositoryToken(Parto), useValue: mockPartoRepository },
        { provide: getRepositoryToken(Animal), useValue: mockAnimalRepository },
        { provide: getRepositoryToken(CodigoIdentificacao), useValue: mockCodigoRepository },
      ],
    }).compile();

    service = module.get<PartoService>(PartoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const fazendaId = 'fazenda-1';
    const matriz = {
      id: 'matriz-1',
      fazendaId,
      categoria: CategoriaAnimal.MATRIZ,
      racaId: 'raca-1',
    };
    const codigoDisponivel = (id: string, numero: number) => ({
      id,
      fazendaId,
      numero,
      status: StatusCodigo.DISPONIVEL,
    });

    it('rejeita parto se a mae nao for MATRIZ', async () => {
      mockAnimalRepository.findOneBy.mockResolvedValue({
        ...matriz,
        categoria: CategoriaAnimal.NOVILHA,
      });

      const dto = {
        maeId: 'matriz-1',
        data: '2026-01-01',
        tipo: TipoParto.NORMAL,
        resultado: ResultadoParto.VIVO,
        crias: [{ codigoId: 'codigo-1', sexo: Sexo.F }],
      };

      await expect(service.create(fazendaId, dto as any)).rejects.toThrow(BadRequestException);
    });

    it('rejeita parto se a mae nao existir', async () => {
      mockAnimalRepository.findOneBy.mockResolvedValue(null);

      const dto = {
        maeId: 'inexistente',
        data: '2026-01-01',
        tipo: TipoParto.NORMAL,
        resultado: ResultadoParto.NATIMORTO,
      };

      await expect(service.create(fazendaId, dto as any)).rejects.toThrow(NotFoundException);
    });

    it('rejeita se um codigo de cria nao estiver disponivel', async () => {
      mockAnimalRepository.findOneBy.mockResolvedValue(matriz);
      mockCodigoRepository.findOneBy.mockResolvedValue({
        ...codigoDisponivel('codigo-1', 1),
        status: StatusCodigo.VINCULADO,
      });

      const dto = {
        maeId: 'matriz-1',
        data: '2026-01-01',
        tipo: TipoParto.NORMAL,
        resultado: ResultadoParto.VIVO,
        crias: [{ codigoId: 'codigo-1', sexo: Sexo.F }],
      };

      await expect(service.create(fazendaId, dto as any)).rejects.toThrow(ConflictException);
    });

    it('rejeita se o mesmo codigo for usado em duas crias do mesmo parto', async () => {
      mockAnimalRepository.findOneBy.mockResolvedValue(matriz);
      mockCodigoRepository.findOneBy.mockResolvedValue(codigoDisponivel('codigo-1', 1));

      const dto = {
        maeId: 'matriz-1',
        data: '2026-01-01',
        tipo: TipoParto.NORMAL,
        resultado: ResultadoParto.VIVO,
        crias: [
          { codigoId: 'codigo-1', sexo: Sexo.F },
          { codigoId: 'codigo-1', sexo: Sexo.M },
        ],
      };

      await expect(service.create(fazendaId, dto as any)).rejects.toThrow(BadRequestException);
    });

    it('usa o numero do codigo como brinco e categoria conforme o sexo', async () => {
      mockAnimalRepository.findOneBy.mockResolvedValue(matriz);
      mockCodigoRepository.findOneBy.mockImplementation((criterio: any) => {
        if (criterio.id === 'codigo-1') return Promise.resolve(codigoDisponivel('codigo-1', 10));
        if (criterio.id === 'codigo-2') return Promise.resolve(codigoDisponivel('codigo-2', 11));
        return Promise.resolve(null);
      });
      mockManager.create.mockImplementation((_entidade: any, entrada: any) => entrada);
      mockManager.save.mockImplementation((entrada: any) =>
        Promise.resolve({ id: `id-${entrada.brinco ?? entrada.numero ?? 'parto'}`, ...entrada }),
      );
      mockManager.findOne.mockResolvedValue({ id: 'parto-1', crias: [] });

      const dto = {
        maeId: 'matriz-1',
        data: '2026-01-01',
        tipo: TipoParto.NORMAL,
        resultado: ResultadoParto.VIVO,
        crias: [
          { codigoId: 'codigo-1', sexo: Sexo.F },
          { codigoId: 'codigo-2', sexo: Sexo.M },
        ],
      };

      await service.create(fazendaId, dto as any);

      const chamadasDeAnimal = mockManager.create.mock.calls.filter(
        (chamada) => chamada[0] === Animal,
      );
      expect(chamadasDeAnimal[0][1].brinco).toBe('10');
      expect(chamadasDeAnimal[0][1].categoria).toBe(CategoriaAnimal.NOVILHA);
      expect(chamadasDeAnimal[1][1].brinco).toBe('11');
      expect(chamadasDeAnimal[1][1].categoria).toBe(CategoriaAnimal.BEZERRO);
    });
        it('cria a movimentacao inicial de pasto para as crias quando pastoId e informado', async () => {
      mockAnimalRepository.findOneBy.mockResolvedValue(matriz);
      mockCodigoRepository.findOneBy.mockResolvedValue(codigoDisponivel('codigo-1', 10));
      mockManager.create.mockImplementation((_entidade: any, entrada: any) => entrada);
      mockManager.save.mockImplementation((entrada: any) =>
        Promise.resolve({ id: `id-${entrada.brinco ?? entrada.numero ?? 'parto'}`, ...entrada }),
      );
      mockManager.findOne.mockResolvedValue({ id: 'parto-1', crias: [] });

      const dto = {
        maeId: 'matriz-1',
        data: '2026-01-01',
        tipo: TipoParto.NORMAL,
        resultado: ResultadoParto.VIVO,
        pastoId: 'pasto-1',
        crias: [{ codigoId: 'codigo-1', sexo: Sexo.F }],
      };

      await service.create(fazendaId, dto as any);

      const chamadasDeMovimentacao = mockManager.create.mock.calls.filter(
        (chamada) => chamada[0] === MovimentacaoPasto,
      );
      expect(chamadasDeMovimentacao).toHaveLength(1);
      expect(chamadasDeMovimentacao[0][1]).toMatchObject({
        pastoId: 'pasto-1',
        dataEntrada: dto.data,
      });
    });
  });
});