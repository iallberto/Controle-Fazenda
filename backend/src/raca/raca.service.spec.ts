import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
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

  describe('onModuleInit (raças padrão)', () => {
    it('cria as quatro raças leiteiras padrão com a gestação média (spec 004, FR-030)', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);
      mockRepository.create.mockImplementation((x) => x);
      await service.onModuleInit();
      const criadas = mockRepository.save.mock.calls.map(([r]) => r);
      expect(criadas).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ nome: 'Holandesa', gestacaoMediaDias: 280, leiteira: true, fazendaId: null }),
          expect.objectContaining({ nome: 'Girolando', gestacaoMediaDias: 285, leiteira: true }),
          expect.objectContaining({ nome: 'Jersey', gestacaoMediaDias: 279, leiteira: true }),
          expect.objectContaining({ nome: 'Gir', gestacaoMediaDias: 290, leiteira: true }),
          expect.objectContaining({ nome: 'Nelore', leiteira: false }),
        ]),
      );
    });

    it('corrige a marca leiteira de uma raça padrão que já existe', async () => {
      mockRepository.findOneBy.mockImplementation(async ({ nome }) =>
        nome === 'Gir' ? { id: 'r1', nome: 'Gir', leiteira: false } : { nome, leiteira: nome !== 'Nelore' && ['Holandesa', 'Girolando', 'Jersey'].includes(nome) },
      );
      await service.onModuleInit();
      expect(mockRepository.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'r1', nome: 'Gir', leiteira: true }));
    });
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
    it('lanca NotFoundException quando a raca e de outra fazenda', async () => {
      mockRepository.findOneBy.mockResolvedValue({
        id: 'raca-1',
        nome: 'Raca X',
        fazendaId: 'fazenda-2',
      });

      await expect(service.findOne('fazenda-1', 'raca-1')).rejects.toThrow(NotFoundException);
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