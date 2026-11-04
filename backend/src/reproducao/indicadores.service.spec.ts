import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IndicadoresService } from './indicadores.service';
import { EstacaoMonta } from './entities/estacao-monta.entity';
import { ExposicaoMonta } from './entities/exposicao-monta.entity';
import { Inseminacao } from './entities/inseminacao.entity';
import { DiagnosticoGestacao } from './entities/diagnostico-gestacao.entity';
import { Animal, StatusAnimal } from '../animal/entities/animal.entity';
import { Parto } from '../parto/entities/parto.entity';

describe('IndicadoresService', () => {
  let service: IndicadoresService;

  const repo = () => ({ find: jest.fn().mockResolvedValue([]) });
  const estacaoRepository = repo();
  const exposicaoRepository = repo();
  const inseminacaoRepository = repo();
  const diagnosticoRepository = repo();
  const animalRepository = repo();
  const partoRepository = repo();

  const ativa = { status: StatusAnimal.ATIVO };
  const naoCancelado = { cancelamento: { cancelado: false } };
  const exposicao = (femeaId: string, extra: object = {}) => ({
    femeaId,
    dataInicio: '2026-01-10',
    femea: ativa,
    ...naoCancelado,
    ...extra,
  });
  const diagnostico = (femeaId: string, resultado: string) => ({
    femeaId,
    data: '2026-04-10',
    resultado,
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    for (const r of [
      estacaoRepository,
      exposicaoRepository,
      inseminacaoRepository,
      diagnosticoRepository,
      animalRepository,
      partoRepository,
    ]) {
      r.find.mockResolvedValue([]);
    }
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IndicadoresService,
        {
          provide: getRepositoryToken(EstacaoMonta),
          useValue: estacaoRepository,
        },
        {
          provide: getRepositoryToken(ExposicaoMonta),
          useValue: exposicaoRepository,
        },
        {
          provide: getRepositoryToken(Inseminacao),
          useValue: inseminacaoRepository,
        },
        {
          provide: getRepositoryToken(DiagnosticoGestacao),
          useValue: diagnosticoRepository,
        },
        { provide: getRepositoryToken(Animal), useValue: animalRepository },
        { provide: getRepositoryToken(Parto), useValue: partoRepository },
      ],
    }).compile();
    service = module.get(IndicadoresService);
  });

  it('taxa por estação ignora exposição cancelada e conta à parte quem saiu', async () => {
    estacaoRepository.find.mockResolvedValue([
      {
        id: 'e1',
        touroId: 't1',
        touro: { brinco: '1' },
        pasto: { nome: 'Monta' },
        dataEntrada: '2026-01-10',
        dataSaida: '2026-03-10',
        exposicoes: [
          exposicao('v1'),
          exposicao('v2'),
          exposicao('v3'),
          exposicao('v4', { femea: { status: StatusAnimal.VENDIDO } }),
          exposicao('v5', { cancelamento: { cancelado: true } }),
        ],
      },
    ]);
    diagnosticoRepository.find.mockResolvedValue([
      diagnostico('v1', 'PRENHE'),
      diagnostico('v2', 'PRENHE'),
      diagnostico('v3', 'VAZIA'),
      diagnostico('v5', 'VAZIA'),
    ]);

    const resultado = await service.indicadores('f1');

    expect(resultado.estacoes[0]).toMatchObject({
      touro: { id: 't1', brinco: '1' },
      pasto: 'Monta',
      cobertas: 4,
      prenhes: 2,
      vazias: 1,
      sairam: 1,
      semDiagnostico: 0,
    });
    expect(resultado.estacoes[0].taxa).toBeCloseTo(2 / 3);
    expect(resultado.touros).toEqual([
      expect.objectContaining({
        touro: { id: 't1', brinco: '1' },
        estacoes: 1,
        prenhes: 2,
      }),
    ]);
  });

  it('taxa por sêmen a partir das inseminações', async () => {
    inseminacaoRepository.find.mockResolvedValue([
      {
        femeaId: 'v1',
        semenId: 's1',
        data: '2026-02-01',
        femea: ativa,
        semen: { nomeTouro: 'Netuno' },
      },
      {
        femeaId: 'v2',
        semenId: 's1',
        data: '2026-02-01',
        femea: ativa,
        semen: { nomeTouro: 'Netuno' },
      },
    ]);
    diagnosticoRepository.find.mockResolvedValue([
      diagnostico('v1', 'PRENHE'),
      diagnostico('v2', 'VAZIA'),
    ]);

    const resultado = await service.indicadores('f1');

    expect(resultado.semens).toEqual([
      expect.objectContaining({
        semen: { id: 's1', nomeTouro: 'Netuno' },
        cobertas: 2,
        prenhes: 1,
        taxa: 0.5,
      }),
    ]);
  });

  it('intervalo entre partos por matriz, com o brinco', async () => {
    partoRepository.find.mockResolvedValue([
      { maeId: 'm1', data: '2025-01-01', mae: { brinco: '4' } },
      { maeId: 'm1', data: '2026-01-01', mae: { brinco: '4' } },
    ]);

    const { intervaloPartos } = await service.indicadores('f1');

    expect(intervaloPartos).toEqual({
      mediaRebanhoDias: 365,
      porMatriz: [
        {
          animal: { id: 'm1', brinco: '4' },
          partos: 2,
          ultimoIntervaloDias: 365,
          mediaDias: 365,
        },
      ],
    });
  });

  it('vacas vazias com dias desde o parto, última cobertura e último diagnóstico', async () => {
    animalRepository.find.mockResolvedValue([
      {
        id: 'v1',
        brinco: '10',
        categoria: 'MATRIZ',
        pastoAtual: { nome: 'Monta' },
      },
      { id: 'v2', brinco: '9', categoria: 'NOVILHA', pastoAtual: null },
    ]);
    partoRepository.find.mockResolvedValue([
      { maeId: 'v1', data: '2026-01-01' },
      { maeId: 'v1', data: '2025-01-01' },
    ]);
    exposicaoRepository.find.mockResolvedValue([
      { femeaId: 'v1', dataInicio: '2026-03-01', estacao: naoCancelado },
      // estação cancelada não conta como cobertura
      {
        femeaId: 'v1',
        dataInicio: '2026-06-01',
        estacao: { cancelamento: { cancelado: true } },
      },
    ]);
    inseminacaoRepository.find.mockResolvedValue([
      { femeaId: 'v2', data: '2026-05-01' },
    ]);
    diagnosticoRepository.find.mockResolvedValue([
      { femeaId: 'v1', data: '2026-05-20' },
      { femeaId: 'v2', data: '2026-07-01' },
    ]);

    const lista = await service.vacasVazias('f1', '2026-11-03');

    expect(lista).toEqual([
      {
        animal: { id: 'v2', brinco: '9', categoria: 'NOVILHA' },
        pasto: null,
        ultimoParto: null,
        diasDesdeParto: null,
        ultimaCobertura: '2026-05-01',
        ultimoDiagnostico: '2026-07-01',
      },
      {
        animal: { id: 'v1', brinco: '10', categoria: 'MATRIZ' },
        pasto: 'Monta',
        ultimoParto: '2026-01-01',
        diasDesdeParto: 306,
        ultimaCobertura: '2026-03-01',
        ultimoDiagnostico: '2026-05-20',
      },
    ]);
  });

  it('sem vazias, não consulta o resto', async () => {
    expect(await service.vacasVazias('f1')).toEqual([]);
    expect(partoRepository.find).not.toHaveBeenCalled();
  });
});
