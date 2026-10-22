import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { PastoService } from './pasto.service';
import { Pasto } from './entities/pasto.entity';

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const createMockRepository = (): MockRepository => ({
  find: jest.fn(),
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

describe('PastoService', () => {
  let service: PastoService;
  let repository: MockRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PastoService,
        {
          provide: getRepositoryToken(Pasto),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<PastoService>(PastoService);
    repository = module.get(getRepositoryToken(Pasto));
  });

  describe('create', () => {
    it('deve criar um pasto quando o nome ainda não existe na fazenda, registrando quem criou', async () => {
      const fazendaId = 'fazenda-1';
      const usuarioLogadoId = 'usuario-logado-1';
      const dto = { nome: 'Pasto Novo' };

      repository.findOneBy!.mockResolvedValue(null);
      repository.create!.mockImplementation((entrada) => entrada);
      repository.save!.mockResolvedValue({ id: 'pasto-1', ...dto, fazendaId, criadoPorId: usuarioLogadoId });

      const resultado = await service.create(fazendaId, usuarioLogadoId, dto as any);

      expect(repository.create).toHaveBeenCalledWith({
        ...dto,
        fazendaId,
        criadoPorId: usuarioLogadoId,
      });
      expect(resultado.criadoPorId).toBe(usuarioLogadoId);
    });

    it('deve lançar ConflictException quando já existe um pasto com o mesmo nome na fazenda', async () => {
      const fazendaId = 'fazenda-1';
      const usuarioLogadoId = 'usuario-logado-1';
      const dto = { nome: 'Pasto Repetido' };

      repository.findOneBy!.mockResolvedValue({ id: 'existente', ...dto, fazendaId });

      await expect(service.create(fazendaId, usuarioLogadoId, dto as any)).rejects.toThrow(ConflictException);
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('deve lançar ForbiddenException quando o pasto pertence a outra fazenda', async () => {
      repository.findOneBy!.mockResolvedValue({
        id: 'pasto-1',
        nome: 'Pasto X',
        fazendaId: 'fazenda-2',
      });

      await expect(service.findOne('fazenda-1', 'pasto-1')).rejects.toThrow(ForbiddenException);
    });

    it('deve lançar NotFoundException quando o pasto não existe', async () => {
      repository.findOneBy!.mockResolvedValue(null);

      await expect(service.findOne('fazenda-1', 'pasto-inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});