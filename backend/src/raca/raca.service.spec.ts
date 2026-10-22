import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { IsNull } from 'typeorm';
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
    jest.clearAllMocks();
    mockRepository.findOneBy.mockResolvedValue({ nome: 'Nelore' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [RacaService, { provide: getRepositoryToken(Raca), useValue: mockRepository }],
    }).compile();

    service = module.get<RacaService>(RacaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('cria uma raca customizada registrando quem criou', async () => {
      const fazendaId = 'fazenda-1';
      const usuarioLogadoId = 'usuario-logado-1';
      const dto = { nome: 'Nelore x Simental', gestacaoMediaDias: 288 };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockImplementation((entrada) => entrada);
      mockRepository.save.mockResolvedValue({ id: 'raca-1', ...dto, fazendaId, criadoPorId: usuarioLogadoId });

      const resultado = await service.create(fazendaId, usuarioLogadoId, dto as any);

      expect(mockRepository.create).toHaveBeenCalledWith({
        ...dto,
        fazendaId,
        criadoPorId: usuarioLogadoId,
      });
      expect(resultado.criadoPorId).toBe(usuarioLogadoId);
    });

    it('rejeita nome repetido entre raca do sistema e da fazenda', async () => {
      const fazendaId = 'fazenda-1';
      const usuarioLogadoId = 'usuario-logado-1';
      const dto = { nome: 'Nelore', gestacaoMediaDias: 291 };

      mockRepository.findOne.mockResolvedValue({ id: 'existente', nome: 'Nelore' });

      await expect(service.create(fazendaId, usuarioLogadoId, dto as any)).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('lanca ForbiddenException quando a raca e de outra fazenda', async () => {
      mockRepository.findOneBy.mockResolvedValue({
        id: 'raca-1',
        nome: 'Raca X',
        fazendaId: 'fazenda-2',
      });

      await expect(service.findOne('fazenda-1', 'raca-1')).rejects.toThrow(ForbiddenException);
    });

    it('permite acessar raca do sistema (fazendaId nulo) de qualquer fazenda', async () => {
      mockRepository.findOneBy.mockResolvedValue({
        id: 'raca-1',
        nome: 'Nelore',
        fazendaId: null,
      });

      await expect(service.findOne('fazenda-1', 'raca-1')).resolves.toBeDefined();
    });
  });

  describe('update', () => {
    it('rejeita alterar raca padrao do sistema', async () => {
      mockRepository.findOneBy.mockResolvedValue({
        id: 'raca-1',
        nome: 'Nelore',
        fazendaId: null,
      });

      await expect(
        service.update('fazenda-1', 'raca-1', { nome: 'Nelore Editado' } as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});