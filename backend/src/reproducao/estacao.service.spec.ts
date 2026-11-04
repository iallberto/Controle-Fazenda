import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { EstacaoService } from './estacao.service';
import { SituacaoService } from './situacao.service';
import {
  EstacaoMonta,
  MotivoEncerramento,
} from './entities/estacao-monta.entity';
import {
  ExposicaoMonta,
  MotivoFimExposicao,
} from './entities/exposicao-monta.entity';
import { ExcecaoEstacao } from './entities/excecao-estacao.entity';
import {
  Animal,
  CategoriaAnimal,
  Sexo,
  StatusAnimal,
} from '../animal/entities/animal.entity';
import { Pasto } from '../pasto/entities/pasto.entity';
import { MovimentacaoPasto } from '../movimentacao-pasto/entities/movimentacao-pasto.entity';

describe('EstacaoService', () => {
  let service: EstacaoService;

  const manager = {
    create: jest.fn(),
    save: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    find: jest.fn(),
  };
  const estacaoRepository = {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    find: jest.fn(),
    manager: { transaction: jest.fn() },
  };
  const exposicaoRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
  };
  const animalRepository = { findOneBy: jest.fn(), findBy: jest.fn() };
  const pastoRepository = { findOneBy: jest.fn() };
  const situacaoService = {
    listarAptas: jest.fn(),
    motivoInaptidao: jest.fn(),
  };

  const touro = {
    id: 't1',
    fazendaId: 'f1',
    brinco: '9',
    status: StatusAnimal.ATIVO,
    sexo: Sexo.M,
    categoria: CategoriaAnimal.TOURO,
  };
  const aptas = [{ id: 'a1' }, { id: 'a2' }, { id: 'a3' }];
  const dtoAbrir = {
    touroId: 't1',
    pastoId: 'p1',
    dataEntrada: '2026-10-01',
    femeaIds: ['a1', 'a2'],
    excecoes: [{ femeaId: 'a3', motivo: 'Novilha muito nova' }],
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    estacaoRepository.manager.transaction.mockImplementation(
      (cb: (m: typeof manager) => unknown) => cb(manager),
    );
    animalRepository.findOneBy.mockResolvedValue(touro);
    pastoRepository.findOneBy.mockResolvedValue({
      id: 'p1',
      fazendaId: 'f1',
      nome: 'Pasto Monta',
    });
    estacaoRepository.findOne.mockResolvedValue(null);
    situacaoService.listarAptas.mockResolvedValue(aptas);
    manager.create.mockImplementation(
      (_entidade: unknown, dados: object) => dados,
    );
    manager.save.mockImplementation(async (dados: object) => ({
      id: 'e1',
      ...dados,
    }));
    manager.find.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EstacaoService,
        {
          provide: getRepositoryToken(EstacaoMonta),
          useValue: estacaoRepository,
        },
        {
          provide: getRepositoryToken(ExposicaoMonta),
          useValue: exposicaoRepository,
        },
        { provide: getRepositoryToken(Animal), useValue: animalRepository },
        { provide: getRepositoryToken(Pasto), useValue: pastoRepository },
        { provide: SituacaoService, useValue: situacaoService },
      ],
    }).compile();

    service = module.get(EstacaoService);
  });

  describe('abrir', () => {
    it('cria a estação com as marcadas expostas e as exceções com motivo', async () => {
      const resultado = await service.abrir('f1', 'u1', dtoAbrir);

      expect(situacaoService.listarAptas).toHaveBeenCalledWith(
        'f1',
        { pastoId: 'p1' },
        '2026-10-01',
      );
      expect(manager.insert).toHaveBeenCalledWith(ExposicaoMonta, [
        {
          estacaoId: 'e1',
          femeaId: 'a1',
          dataInicio: '2026-10-01',
          criadoPorId: 'u1',
        },
        {
          estacaoId: 'e1',
          femeaId: 'a2',
          dataInicio: '2026-10-01',
          criadoPorId: 'u1',
        },
      ]);
      expect(manager.insert).toHaveBeenCalledWith(ExcecaoEstacao, [
        { estacaoId: 'e1', femeaId: 'a3', motivo: 'Novilha muito nova' },
      ]);
      expect(resultado).toEqual({ id: 'e1', expostas: 2, excecoes: 1 });
    });

    it('move o touro para o pasto da estação quando ele está em outro', async () => {
      animalRepository.findOneBy.mockResolvedValue({
        ...touro,
        pastoAtualId: 'p9',
      });

      await service.abrir('f1', 'u1', dtoAbrir);

      expect(manager.insert).toHaveBeenCalledWith(
        MovimentacaoPasto,
        expect.objectContaining({
          animalId: 't1',
          pastoId: 'p1',
          dataEntrada: '2026-10-01',
        }),
      );
      expect(manager.update).toHaveBeenCalledWith(
        Animal,
        { id: 't1' },
        { pastoAtualId: 'p1', atualizadoPorId: 'u1' },
      );
    });

    it('não move o touro que já está no pasto', async () => {
      animalRepository.findOneBy.mockResolvedValue({
        ...touro,
        pastoAtualId: 'p1',
      });
      await service.abrir('f1', 'u1', dtoAbrir);
      expect(manager.insert).not.toHaveBeenCalledWith(
        MovimentacaoPasto,
        expect.anything(),
      );
    });

    it('recusa animal que não é touro ativo (FR-008)', async () => {
      animalRepository.findOneBy.mockResolvedValue({
        ...touro,
        categoria: CategoriaAnimal.BOI,
      });
      await expect(service.abrir('f1', 'u1', dtoAbrir)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('não revela touro de outra fazenda', async () => {
      animalRepository.findOneBy.mockResolvedValue({
        ...touro,
        fazendaId: 'outra',
      });
      await expect(service.abrir('f1', 'u1', dtoAbrir)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('recusa touro que já está numa estação aberta (FR-005)', async () => {
      estacaoRepository.findOne.mockResolvedValue({
        id: 'e0',
        dataEntrada: '2026-09-01',
        pasto: { nome: 'Pasto Velho' },
      });
      await expect(service.abrir('f1', 'u1', dtoAbrir)).rejects.toThrow(
        ConflictException,
      );
    });

    it('recusa quando a lista não bate com as aptas do pasto', async () => {
      await expect(
        service.abrir('f1', 'u1', { ...dtoAbrir, excecoes: [] }),
      ).rejects.toThrow('mudou');
      expect(manager.insert).not.toHaveBeenCalled();
    });

    it('recusa estação sem nenhuma fêmea marcada', async () => {
      await expect(
        service.abrir('f1', 'u1', {
          ...dtoAbrir,
          femeaIds: [],
          excecoes: aptas.map((femea) => ({ femeaId: femea.id, motivo: 'x' })),
        }),
      ).rejects.toThrow('ao menos uma');
    });
  });

  describe('incluirFemeas', () => {
    const estacaoAberta = {
      id: 'e1',
      fazendaId: 'f1',
      dataEntrada: '2026-10-01',
      dataSaida: null,
      cancelamento: { cancelado: false },
    };

    beforeEach(() => {
      estacaoRepository.findOneBy.mockResolvedValue(estacaoAberta);
      animalRepository.findBy.mockResolvedValue([
        { id: 'a9', fazendaId: 'f1', brinco: '9' },
      ]);
      situacaoService.motivoInaptidao.mockResolvedValue(null);
      exposicaoRepository.find.mockResolvedValue([]);
    });

    it('inclui fêmea apta a partir da data informada (FR-006)', async () => {
      await service.incluirFemeas('f1', 'u1', 'e1', {
        femeaIds: ['a9'],
        dataInicio: '2026-10-10',
      });
      expect(exposicaoRepository.insert).toHaveBeenCalledWith([
        {
          estacaoId: 'e1',
          femeaId: 'a9',
          dataInicio: '2026-10-10',
          criadoPorId: 'u1',
        },
      ]);
    });

    it('recusa data anterior à entrada do touro', async () => {
      await expect(
        service.incluirFemeas('f1', 'u1', 'e1', {
          femeaIds: ['a9'],
          dataInicio: '2026-09-20',
        }),
      ).rejects.toThrow('antes do touro');
    });

    it('recusa fêmea que não está apta, dizendo o motivo', async () => {
      situacaoService.motivoInaptidao.mockResolvedValue('já está prenhe');
      await expect(
        service.incluirFemeas('f1', 'u1', 'e1', {
          femeaIds: ['a9'],
          dataInicio: '2026-10-10',
        }),
      ).rejects.toThrow('já está prenhe');
    });

    it('recusa incluir em estação encerrada', async () => {
      estacaoRepository.findOneBy.mockResolvedValue({
        ...estacaoAberta,
        dataSaida: '2026-10-05',
      });
      await expect(
        service.incluirFemeas('f1', 'u1', 'e1', {
          femeaIds: ['a9'],
          dataInicio: '2026-10-10',
        }),
      ).rejects.toThrow('encerrada');
    });
  });

  describe('encerrar', () => {
    beforeEach(() => {
      estacaoRepository.findOneBy.mockResolvedValue({
        id: 'e1',
        fazendaId: 'f1',
        dataEntrada: '2026-10-01',
        dataSaida: null,
        cancelamento: { cancelado: false },
      });
      manager.find.mockResolvedValue([{ id: 'x1', dataInicio: '2026-10-01' }]);
      // detalhar depois de encerrar
      estacaoRepository.findOne.mockResolvedValue({
        id: 'e1',
        fazendaId: 'f1',
        exposicoes: [],
        excecoes: [],
      });
    });

    it('recusa saída anterior à entrada (FR-004)', async () => {
      await expect(
        service.encerrar('f1', 'u1', 'e1', { dataSaida: '2026-09-30' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('fecha a estação e as exposições abertas na mesma data', async () => {
      await service.encerrar('f1', 'u1', 'e1', { dataSaida: '2026-12-15' });

      expect(manager.update).toHaveBeenCalledWith(
        EstacaoMonta,
        { id: 'e1' },
        {
          dataSaida: '2026-12-15',
          motivoEncerramento: MotivoEncerramento.MANUAL,
          atualizadoPorId: 'u1',
        },
      );
      expect(manager.update).toHaveBeenCalledWith(
        ExposicaoMonta,
        { id: 'x1' },
        {
          dataFim: '2026-12-15',
          motivoFim: MotivoFimExposicao.ESTACAO_ENCERRADA,
          atualizadoPorId: 'u1',
        },
      );
    });
  });

  describe('cancelar', () => {
    it('cancela a estação e as exposições com o motivo, sem excluir', async () => {
      estacaoRepository.findOneBy.mockResolvedValue({
        id: 'e1',
        fazendaId: 'f1',
        cancelamento: { cancelado: false },
      });

      await service.cancelar('f1', 'dono', 'e1', ' Touro errado ');

      const esperado = expect.objectContaining({
        cancelamento: expect.objectContaining({
          cancelado: true,
          canceladoPorId: 'dono',
          motivoCancelamento: 'Touro errado',
        }),
      });
      expect(manager.update).toHaveBeenCalledWith(
        EstacaoMonta,
        { id: 'e1' },
        esperado,
      );
      expect(manager.update).toHaveBeenCalledWith(
        ExposicaoMonta,
        { estacaoId: 'e1', cancelamento: { cancelado: false } },
        esperado,
      );
    });

    it('não cancela duas vezes', async () => {
      estacaoRepository.findOneBy.mockResolvedValue({
        id: 'e1',
        fazendaId: 'f1',
        cancelamento: { cancelado: true },
      });
      await expect(service.cancelar('f1', 'dono', 'e1', 'x')).rejects.toThrow(
        'já foi cancelada',
      );
    });
  });
});
