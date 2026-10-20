import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TratamentoService } from './tratamento.service';
import { Tratamento, AplicadoPorTipo } from './entities/tratamento.entity';
import { Animal } from '../animal/entities/animal.entity';
import { Usuario } from '../usuario/entities/usuario.entity';
import { Veterinario } from '../veterinario/entities/veterinario.entity';

describe('TratamentoService', () => {
  let service: TratamentoService;

  const mockTratamentoRepository = {
    find: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockAnimalRepository = {
    findOneBy: jest.fn(),
  };

  const mockUsuarioRepository = {
    findOneBy: jest.fn(),
  };

  const mockVeterinarioRepository = {
    findOneBy: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TratamentoService,
        { provide: getRepositoryToken(Tratamento), useValue: mockTratamentoRepository },
        { provide: getRepositoryToken(Animal), useValue: mockAnimalRepository },
        { provide: getRepositoryToken(Usuario), useValue: mockUsuarioRepository },
        { provide: getRepositoryToken(Veterinario), useValue: mockVeterinarioRepository },
      ],
    }).compile();

    service = module.get<TratamentoService>(TratamentoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const fazendaId = 'fazenda-1';
    const usuarioLogadoId = 'usuario-logado-1';
    const baseDto = {
      animalId: 'animal-1',
      produto: 'Vermifugo',
      data: '2026-01-10',
    };

    beforeEach(() => {
      mockAnimalRepository.findOneBy.mockResolvedValue({ id: 'animal-1', fazendaId });
      mockTratamentoRepository.create.mockImplementation((entrada) => entrada);
      mockTratamentoRepository.save.mockImplementation((entrada) => Promise.resolve(entrada));
    });

    it('aceita aplicadoPorTipo USUARIO com um usuario valido da fazenda', async () => {
      mockUsuarioRepository.findOneBy.mockResolvedValue({ id: 'usuario-2', fazendaId });

      const dto = {
        ...baseDto,
        aplicadoPorTipo: AplicadoPorTipo.USUARIO,
        aplicadoPorUsuarioId: 'usuario-2',
      };

      const resultado = await service.create(fazendaId, usuarioLogadoId, dto as any);

      expect(resultado.aplicadoPorUsuarioId).toBe('usuario-2');
      expect(resultado.aplicadoPorVeterinarioId).toBeNull();
      expect(resultado.lancadoPorId).toBe(usuarioLogadoId);
    });

    it('aceita aplicadoPorTipo VETERINARIO com um veterinario ativo da fazenda', async () => {
      mockVeterinarioRepository.findOneBy.mockResolvedValue({
        id: 'vet-1',
        fazendaId,
        ativo: true,
      });

      const dto = {
        ...baseDto,
        aplicadoPorTipo: AplicadoPorTipo.VETERINARIO,
        aplicadoPorVeterinarioId: 'vet-1',
      };

      const resultado = await service.create(fazendaId, usuarioLogadoId, dto as any);

      expect(resultado.aplicadoPorVeterinarioId).toBe('vet-1');
      expect(resultado.aplicadoPorUsuarioId).toBeNull();
      expect(resultado.lancadoPorId).toBe(usuarioLogadoId);
    });

    it('rejeita quando o usuario informado nao pertence a fazenda', async () => {
      mockUsuarioRepository.findOneBy.mockResolvedValue({ id: 'usuario-2', fazendaId: 'outra-fazenda' });

      const dto = {
        ...baseDto,
        aplicadoPorTipo: AplicadoPorTipo.USUARIO,
        aplicadoPorUsuarioId: 'usuario-2',
      };

      await expect(service.create(fazendaId, usuarioLogadoId, dto as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rejeita quando o usuario informado nao existe', async () => {
      mockUsuarioRepository.findOneBy.mockResolvedValue(null);

      const dto = {
        ...baseDto,
        aplicadoPorTipo: AplicadoPorTipo.USUARIO,
        aplicadoPorUsuarioId: 'inexistente',
      };

      await expect(service.create(fazendaId, usuarioLogadoId, dto as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejeita quando o veterinario informado esta inativo', async () => {
      mockVeterinarioRepository.findOneBy.mockResolvedValue({
        id: 'vet-1',
        fazendaId,
        ativo: false,
      });

      const dto = {
        ...baseDto,
        aplicadoPorTipo: AplicadoPorTipo.VETERINARIO,
        aplicadoPorVeterinarioId: 'vet-1',
      };

      await expect(service.create(fazendaId, usuarioLogadoId, dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});