import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { VeterinarioService } from './veterinario.service';
import { Veterinario } from './entities/veterinario.entity';

describe('VeterinarioService', () => {
  let service: VeterinarioService;

  const mockRepository = {
    find: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VeterinarioService,
        { provide: getRepositoryToken(Veterinario), useValue: mockRepository },
      ],
    }).compile();

    service = module.get<VeterinarioService>(VeterinarioService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('cria o veterinario com ativo = true e registra quem criou', async () => {
      const fazendaId = 'fazenda-1';
      const usuarioId = 'usuario-1';
      const dto = { nome: 'Dr. João', crmv: 'CRMV-1234' };

      mockRepository.create.mockImplementation((entrada) => entrada);
      mockRepository.save.mockImplementation((entrada) => Promise.resolve({ id: 'vet-1', ...entrada }));

      const resultado = await service.create(fazendaId, usuarioId, dto as any);

      expect(mockRepository.create).toHaveBeenCalledWith({
        fazendaId,
        nome: dto.nome,
        crmv: dto.crmv,
        criadoPorId: usuarioId,
        ativo: true,
      });
      expect(resultado.id).toBe('vet-1');
    });
  });

  describe('findAll', () => {
    it('lista apenas ativos por padrao', async () => {
      const fazendaId = 'fazenda-1';
      mockRepository.find.mockResolvedValue([]);

      await service.findAll(fazendaId);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { fazendaId, ativo: true },
      });
    });

    it('lista todos quando incluirInativos e true', async () => {
      const fazendaId = 'fazenda-1';
      mockRepository.find.mockResolvedValue([]);

      await service.findAll(fazendaId, true);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { fazendaId },
      });
    });
  });

  describe('inativar', () => {
    const fazendaId = 'fazenda-1';
    const veterinarioExistente = { id: 'vet-1', fazendaId, ativo: true };

    it('marca o veterinario como inativo', async () => {
      mockRepository.findOneBy.mockResolvedValue(veterinarioExistente);
      mockRepository.save.mockImplementation((entrada) => Promise.resolve(entrada));

      const resultado = await service.inativar(fazendaId, 'vet-1');

      expect(resultado.ativo).toBe(false);
    });

    it('lanca NotFoundException quando o veterinario nao existe', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(service.inativar(fazendaId, 'inexistente')).rejects.toThrow(NotFoundException);
    });

    it('lanca ForbiddenException quando o veterinario e de outra fazenda', async () => {
      mockRepository.findOneBy.mockResolvedValue({ ...veterinarioExistente, fazendaId: 'outra-fazenda' });

      await expect(service.inativar(fazendaId, 'vet-1')).rejects.toThrow(ForbiddenException);
    });
  });
});