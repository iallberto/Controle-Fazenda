import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DiagnosticoService } from './diagnostico.service';
import { SituacaoService } from './situacao.service';
import {
  DiagnosticoGestacao,
  MetodoDiagnostico,
  ResultadoDiagnostico,
} from './entities/diagnostico-gestacao.entity';
import {
  Animal,
  CategoriaAnimal,
  Sexo,
  StatusAnimal,
  StatusReprodutivo,
} from '../animal/entities/animal.entity';
import { Parto, ResultadoParto } from '../parto/entities/parto.entity';
import { AplicadoPorTipo } from '../tratamento/entities/tratamento.entity';
import { TratamentoService } from '../tratamento/tratamento.service';

describe('DiagnosticoService', () => {
  let service: DiagnosticoService;

  const manager = {
    create: jest.fn(),
    save: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
  };
  const diagnosticoRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    manager: { transaction: jest.fn() },
  };
  const animalRepository = { findOneBy: jest.fn() };
  const situacaoService = { buscarFemeas: jest.fn() };
  const tratamentoService = { validarAplicador: jest.fn() };

  const femea = {
    id: 'v1',
    fazendaId: 'f1',
    brinco: '12',
    sexo: Sexo.F,
    status: StatusAnimal.ATIVO,
    categoria: CategoriaAnimal.MATRIZ,
    statusReprodutivo: null as StatusReprodutivo | null,
  };
  const quemFez = {
    feitoPorTipo: AplicadoPorTipo.USUARIO,
    feitoPorUsuarioId: 'u1',
  };

  // O último diagnóstico e o último parto que o recálculo de status vai encontrar
  let ultimoDiagnostico: Partial<DiagnosticoGestacao> | null;
  let ultimoParto: Partial<Parto> | null;

  beforeEach(async () => {
    jest.resetAllMocks();
    ultimoDiagnostico = null;
    ultimoParto = null;
    diagnosticoRepository.manager.transaction.mockImplementation(
      (cb: (m: typeof manager) => unknown) => cb(manager),
    );
    animalRepository.findOneBy.mockResolvedValue({ ...femea });
    manager.create.mockImplementation(
      (_entidade: unknown, dados: object) => dados,
    );
    manager.save.mockImplementation(
      async (dados: Partial<DiagnosticoGestacao>) => {
        ultimoDiagnostico = dados;
        return { id: 'd1', ...dados };
      },
    );
    manager.findOne.mockImplementation(async (entidade: unknown) =>
      entidade === Parto ? ultimoParto : ultimoDiagnostico,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiagnosticoService,
        {
          provide: getRepositoryToken(DiagnosticoGestacao),
          useValue: diagnosticoRepository,
        },
        { provide: getRepositoryToken(Animal), useValue: animalRepository },
        { provide: SituacaoService, useValue: situacaoService },
        { provide: TratamentoService, useValue: tratamentoService },
      ],
    }).compile();

    service = module.get(DiagnosticoService);
  });

  const statusGravado = () => {
    const chamada = manager.update.mock.calls.find(
      ([entidade]) => entidade === Animal,
    );
    return chamada?.[2].statusReprodutivo;
  };

  describe('registrar', () => {
    const dto = {
      femeaId: 'v1',
      data: '2026-11-03',
      resultado: ResultadoDiagnostico.PRENHE as const,
      metodo: MetodoDiagnostico.TOQUE,
      idadeGestacionalDias: 112,
      ...quemFez,
    };

    it('prenhe muda o status para Prenha e guarda a idade gestacional', async () => {
      await service.registrar('f1', 'u1', dto);

      expect(manager.create).toHaveBeenCalledWith(
        DiagnosticoGestacao,
        expect.objectContaining({
          resultado: 'PRENHE',
          idadeGestacionalDias: 112,
          criadoPorId: 'u1',
        }),
      );
      expect(statusGravado()).toBe(StatusReprodutivo.PRENHE);
    });

    it('vazia muda o status para Vazia', async () => {
      await service.registrar('f1', 'u1', {
        ...dto,
        resultado: ResultadoDiagnostico.VAZIA,
        idadeGestacionalDias: undefined,
      });
      expect(statusGravado()).toBe(StatusReprodutivo.VAZIA);
    });

    it('recusa idade gestacional em resultado vazia', async () => {
      await expect(
        service.registrar('f1', 'u1', {
          ...dto,
          resultado: ResultadoDiagnostico.VAZIA,
        }),
      ).rejects.toThrow('só se informa em fêmea prenhe');
    });

    it('recusa macho (FR-017)', async () => {
      animalRepository.findOneBy.mockResolvedValue({ ...femea, sexo: Sexo.M });
      await expect(service.registrar('f1', 'u1', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('recusa animal fora do rebanho (FR-017)', async () => {
      animalRepository.findOneBy.mockResolvedValue({
        ...femea,
        status: StatusAnimal.VENDIDO,
      });
      await expect(service.registrar('f1', 'u1', dto)).rejects.toThrow(
        'não está mais no rebanho',
      );
    });

    it('não revela fêmea de outra fazenda', async () => {
      animalRepository.findOneBy.mockResolvedValue({
        ...femea,
        fazendaId: 'outra',
      });
      await expect(service.registrar('f1', 'u1', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('valida quem fez o diagnóstico na fazenda', async () => {
      await service.registrar('f1', 'u1', dto);
      expect(tratamentoService.validarAplicador).toHaveBeenCalledWith(
        'f1',
        'USUARIO',
        'u1',
        undefined,
      );
    });
  });

  describe('registrarLote', () => {
    const dtoLote = {
      pastoId: 'p1',
      data: '2026-11-03',
      metodo: MetodoDiagnostico.TOQUE,
      ...quemFez,
      resultados: [
        {
          femeaId: 'v1',
          resultado: ResultadoDiagnostico.PRENHE as const,
          idadeGestacionalDias: 70,
        },
        { femeaId: 'v2', resultado: ResultadoDiagnostico.VAZIA as const },
      ],
    };

    beforeEach(() => {
      situacaoService.buscarFemeas.mockResolvedValue([
        { id: 'v1' },
        { id: 'v2' },
        { id: 'v3' },
      ]);
    });

    it('cria um registro por fêmea com a mesma data, método e sessão', async () => {
      const resultado = await service.registrarLote('f1', 'u1', dtoLote);

      const [entidade, registros] = manager.insert.mock.calls[0];
      expect(entidade).toBe(DiagnosticoGestacao);
      expect(registros).toHaveLength(2);
      expect(registros[0]).toMatchObject({
        femeaId: 'v1',
        resultado: 'PRENHE',
        metodo: 'TOQUE',
        data: '2026-11-03',
      });
      expect(registros[0].sessaoId).toBeTruthy();
      expect(registros[1].sessaoId).toBe(registros[0].sessaoId);
      expect(resultado).toEqual({ prenhes: 1, vazias: 1 });
    });

    it('recusa fêmea fora do grupo carregado', async () => {
      await expect(
        service.registrarLote('f1', 'u1', {
          ...dtoLote,
          resultados: [
            { femeaId: 'v9', resultado: ResultadoDiagnostico.VAZIA },
          ],
        }),
      ).rejects.toThrow('mudou');
      expect(manager.insert).not.toHaveBeenCalled();
    });

    it('exige pasto ou categoria', async () => {
      await expect(
        service.registrarLote('f1', 'u1', { ...dtoLote, pastoId: undefined }),
      ).rejects.toThrow('pasto, uma categoria');
    });
  });

  describe('registrarPerda', () => {
    it('só aceita fêmea prenhe e volta o status para Vazia (FR-016)', async () => {
      animalRepository.findOneBy.mockResolvedValue({
        ...femea,
        statusReprodutivo: StatusReprodutivo.PRENHE,
      });

      await service.registrarPerda('f1', 'u1', {
        femeaId: 'v1',
        data: '2026-11-03',
        motivo: ' Aborto ',
      });

      expect(manager.create).toHaveBeenCalledWith(
        DiagnosticoGestacao,
        expect.objectContaining({ resultado: 'PERDA', motivo: 'Aborto' }),
      );
      expect(statusGravado()).toBe(StatusReprodutivo.VAZIA);
    });

    it('recusa perda de fêmea que não está prenhe', async () => {
      await expect(
        service.registrarPerda('f1', 'u1', {
          femeaId: 'v1',
          data: '2026-11-03',
          motivo: 'x',
        }),
      ).rejects.toThrow('fêmea prenhe');
    });
  });

  describe('recalcularStatus', () => {
    it('sem eventos, o status fica vazio (nulo)', async () => {
      await service.recalcularStatus(manager as never, 'v1', 'u1');
      expect(statusGravado()).toBeNull();
    });

    it('parto com cria viva mais recente que o diagnóstico deixa Lactante', async () => {
      ultimoDiagnostico = {
        data: '2026-01-10',
        resultado: ResultadoDiagnostico.PRENHE,
      };
      ultimoParto = { data: '2026-10-01', resultado: ResultadoParto.VIVO };
      await service.recalcularStatus(manager as never, 'v1', 'u1');
      expect(statusGravado()).toBe(StatusReprodutivo.LACTANTE);
    });

    it('natimorto deixa Vazia', async () => {
      ultimoParto = { data: '2026-10-01', resultado: ResultadoParto.NATIMORTO };
      await service.recalcularStatus(manager as never, 'v1', 'u1');
      expect(statusGravado()).toBe(StatusReprodutivo.VAZIA);
    });

    it('diagnóstico depois do parto prevalece', async () => {
      ultimoParto = { data: '2026-05-01', resultado: ResultadoParto.VIVO };
      ultimoDiagnostico = {
        data: '2026-09-01',
        resultado: ResultadoDiagnostico.PRENHE,
      };
      await service.recalcularStatus(manager as never, 'v1', 'u1');
      expect(statusGravado()).toBe(StatusReprodutivo.PRENHE);
    });
  });

  describe('cancelar', () => {
    it('cancela com motivo e recalcula o status pelo evento anterior', async () => {
      diagnosticoRepository.findOne.mockResolvedValue({
        id: 'd1',
        femeaId: 'v1',
        femea: { fazendaId: 'f1' },
        cancelamento: { cancelado: false },
      });
      // Depois do cancelamento, o evento válido mais recente é um diagnóstico vazia
      ultimoDiagnostico = {
        data: '2026-06-01',
        resultado: ResultadoDiagnostico.VAZIA,
      };

      await service.cancelar('f1', 'dono', 'd1', ' Lançado na vaca errada ');

      expect(manager.update).toHaveBeenCalledWith(
        DiagnosticoGestacao,
        { id: 'd1' },
        expect.objectContaining({
          cancelamento: expect.objectContaining({
            cancelado: true,
            canceladoPorId: 'dono',
            motivoCancelamento: 'Lançado na vaca errada',
          }),
        }),
      );
      expect(statusGravado()).toBe(StatusReprodutivo.VAZIA);
    });

    it('não revela diagnóstico de outra fazenda', async () => {
      diagnosticoRepository.findOne.mockResolvedValue({
        id: 'd1',
        femea: { fazendaId: 'outra' },
        cancelamento: { cancelado: false },
      });
      await expect(service.cancelar('f1', 'dono', 'd1', 'x')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
