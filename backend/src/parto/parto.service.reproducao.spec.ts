import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { PartoService } from './parto.service';
import { Parto, ResultadoParto, TipoParto } from './entities/parto.entity';
import {
  Animal,
  CategoriaAnimal,
  Sexo,
  StatusAnimal,
  StatusReprodutivo,
} from '../animal/entities/animal.entity';
import {
  CodigoIdentificacao,
  StatusCodigo,
} from '../codigo-identificacao/entities/codigo-identificacao.entity';
import { Pasto } from '../pasto/entities/pasto.entity';
import { ExposicaoMonta } from '../reproducao/entities/exposicao-monta.entity';
import { PartoCandidatoPai } from '../reproducao/entities/parto-candidato-pai.entity';

// Parto ligado à cobertura (US4): novilha vira matriz, status da mãe, pai das crias
describe('PartoService - cobertura e pai (US4)', () => {
  let service: PartoService;

  const manager = {
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    insert: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
  };
  const partoRepository = {
    findOne: jest.fn(),
    manager: { transaction: jest.fn() },
  };
  const animalRepository = { findOneBy: jest.fn(), update: jest.fn() };
  const codigoRepository = { findOneBy: jest.fn() };
  const pastoRepository = { findOneBy: jest.fn() };

  const novilha = {
    id: 'mae-1',
    fazendaId: 'f1',
    brinco: '6',
    sexo: Sexo.F,
    status: StatusAnimal.ATIVO,
    categoria: CategoriaAnimal.NOVILHA,
    racaId: null,
  };
  // Parto em 01/01/2026 → concepção estimada 22/03/2025 (285 dias)
  const dtoVivo = {
    maeId: 'mae-1',
    data: '2026-01-01',
    tipo: TipoParto.NORMAL,
    resultado: ResultadoParto.VIVO,
    crias: [{ codigoId: 'cod-1', sexo: Sexo.M }],
  };
  const exposicao = (touroId: string, brinco: string) => ({
    femeaId: 'mae-1',
    dataInicio: '2025-03-01',
    dataFim: null,
    estacao: { touroId, cancelamento: { cancelado: false }, touro: { brinco } },
  });

  let exposicoes: unknown[];
  let ultimoParto: { data: string; resultado: ResultadoParto } | null;

  beforeEach(async () => {
    jest.resetAllMocks();
    exposicoes = [];
    ultimoParto = null;
    partoRepository.manager.transaction.mockImplementation(
      (cb: (m: typeof manager) => unknown) => cb(manager),
    );
    animalRepository.findOneBy.mockResolvedValue({ ...novilha });
    codigoRepository.findOneBy.mockResolvedValue({
      id: 'cod-1',
      fazendaId: 'f1',
      numero: 20,
      status: StatusCodigo.DISPONIVEL,
    });
    manager.create.mockImplementation(
      (_entidade: unknown, dados: object) => dados,
    );
    manager.save.mockImplementation(async (dados: { brinco?: string }) => {
      if (!dados.brinco)
        ultimoParto = {
          data: dtoVivo.data,
          resultado: (dados as { resultado: ResultadoParto }).resultado,
        };
      return {
        id: dados.brinco ? `cria-${dados.brinco}` : 'parto-1',
        ...dados,
      };
    });
    manager.update.mockResolvedValue({ affected: 1 });
    manager.find.mockImplementation(async (entidade: unknown) =>
      entidade === ExposicaoMonta ? exposicoes : [],
    );
    manager.findOneBy.mockResolvedValue(null);
    // recálculo de status: sem diagnóstico; o parto acabou de ser salvo
    manager.findOne.mockImplementation(async (entidade: unknown) =>
      entidade === Parto ? ultimoParto : null,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartoService,
        { provide: getRepositoryToken(Parto), useValue: partoRepository },
        { provide: getRepositoryToken(Animal), useValue: animalRepository },
        {
          provide: getRepositoryToken(CodigoIdentificacao),
          useValue: codigoRepository,
        },
        { provide: getRepositoryToken(Pasto), useValue: pastoRepository },
      ],
    }).compile();

    service = module.get(PartoService);
  });

  const statusGravado = () =>
    manager.update.mock.calls.find(
      ([entidade, , dados]) =>
        entidade === Animal && 'statusReprodutivo' in dados,
    )?.[2].statusReprodutivo;

  it('aceita parto de novilha e a muda para Matriz (FR-031)', async () => {
    await service.create('f1', 'u1', dtoVivo);

    expect(manager.update).toHaveBeenCalledWith(
      Animal,
      { id: 'mae-1' },
      { categoria: CategoriaAnimal.MATRIZ, atualizadoPorId: 'u1' },
    );
  });

  it('com cria viva a mãe fica Lactante; com natimorto, Vazia (FR-022)', async () => {
    await service.create('f1', 'u1', dtoVivo);
    expect(statusGravado()).toBe(StatusReprodutivo.LACTANTE);

    jest.clearAllMocks();
    await service.create('f1', 'u1', {
      ...dtoVivo,
      resultado: ResultadoParto.NATIMORTO,
      crias: undefined,
    });
    expect(statusGravado()).toBe(StatusReprodutivo.VAZIA);
  });

  it('um único touro candidato vira o pai das crias e fica gravado como candidato', async () => {
    exposicoes = [exposicao('t1', '1')];

    await service.create('f1', 'u1', dtoVivo);

    expect(manager.create).toHaveBeenCalledWith(
      Animal,
      expect.objectContaining({
        paiId: 't1',
        paiSemenId: null,
        maeId: 'mae-1',
      }),
    );
    expect(manager.insert).toHaveBeenCalledWith(PartoCandidatoPai, [
      { partoId: 'parto-1', touroId: 't1', semenId: null },
    ]);
  });

  it('dois touros possíveis deixam o pai em branco e gravam os dois candidatos (FR-021)', async () => {
    exposicoes = [exposicao('t1', '1'), exposicao('t2', '9')];

    await service.create('f1', 'u1', dtoVivo);

    expect(manager.create).toHaveBeenCalledWith(
      Animal,
      expect.objectContaining({ paiId: null, paiSemenId: null }),
    );
    expect(manager.insert).toHaveBeenCalledWith(PartoCandidatoPai, [
      { partoId: 'parto-1', touroId: 't1', semenId: null },
      { partoId: 'parto-1', touroId: 't2', semenId: null },
    ]);
  });

  it('sem cobertura registrada, o parto é aceito sem pai, como antes', async () => {
    await service.create('f1', 'u1', dtoVivo);
    expect(manager.create).toHaveBeenCalledWith(
      Animal,
      expect.objectContaining({ paiId: null, paiSemenId: null }),
    );
    expect(manager.insert).not.toHaveBeenCalledWith(
      PartoCandidatoPai,
      expect.anything(),
    );
  });

  describe('definirPai', () => {
    beforeEach(() => {
      partoRepository.findOne.mockResolvedValue({
        id: 'parto-1',
        mae: { fazendaId: 'f1' },
        candidatos: [{ touroId: 't1' }, { touroId: 't2' }],
        crias: [{ id: 'c1' }],
      });
    });

    it('define o pai das crias entre os candidatos', async () => {
      await service.definirPai('f1', 'dono', 'parto-1', { touroId: 't2' });
      expect(animalRepository.update).toHaveBeenCalledWith(
        { id: expect.anything() },
        { paiId: 't2', paiSemenId: null, atualizadoPorId: 'dono' },
      );
    });

    it('recusa pai que não está entre os candidatos', async () => {
      await expect(
        service.definirPai('f1', 'dono', 'parto-1', { touroId: 't9' }),
      ).rejects.toThrow('um dos candidatos');
    });

    it('exige touro ou sêmen, um dos dois', async () => {
      await expect(
        service.definirPai('f1', 'dono', 'parto-1', {}),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.definirPai('f1', 'dono', 'parto-1', {
          touroId: 't1',
          semenId: 's1',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
