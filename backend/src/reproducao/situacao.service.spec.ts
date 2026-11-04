import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { SituacaoService } from './situacao.service';
import { Animal, Sexo } from '../animal/entities/animal.entity';
import { Parto } from '../parto/entities/parto.entity';
import { ExposicaoMonta } from './entities/exposicao-monta.entity';
import { Inseminacao } from './entities/inseminacao.entity';
import { DiagnosticoGestacao } from './entities/diagnostico-gestacao.entity';
import { Raca } from '../raca/entities/raca.entity';

describe('SituacaoService.historico (FR-023)', () => {
  let service: SituacaoService;

  const repo = () => ({
    find: jest.fn().mockResolvedValue([]),
    findOneBy: jest.fn(),
  });
  const animalRepository = repo();
  const partoRepository = repo();
  const exposicaoRepository = repo();
  const inseminacaoRepository = repo();
  const diagnosticoRepository = repo();

  const ativo = { cancelado: false, motivoCancelamento: null };
  const em = (iso: string) => new Date(iso);

  beforeEach(async () => {
    jest.clearAllMocks();
    for (const r of [
      partoRepository,
      exposicaoRepository,
      inseminacaoRepository,
      diagnosticoRepository,
    ]) {
      r.find.mockResolvedValue([]);
    }
    animalRepository.findOneBy.mockResolvedValue({
      id: 'v1',
      fazendaId: 'f1',
      sexo: Sexo.F,
    });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SituacaoService,
        { provide: getRepositoryToken(Animal), useValue: animalRepository },
        { provide: getRepositoryToken(Parto), useValue: partoRepository },
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
        { provide: getRepositoryToken(Raca), useValue: repo() },
      ],
    }).compile();
    service = module.get(SituacaoService);
  });

  it('junta exposições, inseminações, diagnósticos, perdas e partos, do mais recente ao mais antigo', async () => {
    exposicaoRepository.find.mockResolvedValue([
      {
        id: 'x1',
        estacaoId: 'e1',
        dataInicio: '2026-01-10',
        dataFim: '2026-03-10',
        motivoFim: 'ESTACAO_ENCERRADA',
        criadoEm: em('2026-01-10T10:00:00Z'),
        estacao: {
          touro: { brinco: '1' },
          pasto: { nome: 'Monta' },
          cancelamento: ativo,
        },
        cancelamento: ativo,
      },
    ]);
    inseminacaoRepository.find.mockResolvedValue([
      {
        id: 'i1',
        data: '2026-02-01',
        tipo: 'IATF',
        criadoEm: em('2026-02-01T10:00:00Z'),
        semen: { nomeTouro: 'Netuno' },
        cancelamento: { cancelado: true, motivoCancelamento: 'vaca errada' },
      },
    ]);
    diagnosticoRepository.find.mockResolvedValue([
      {
        id: 'd1',
        data: '2026-04-10',
        resultado: 'PRENHE',
        metodo: 'TOQUE',
        idadeGestacionalDias: 70,
        criadoEm: em('2026-04-10T10:00:00Z'),
        cancelamento: ativo,
      },
      {
        id: 'd2',
        data: '2026-05-01',
        resultado: 'PERDA',
        motivo: 'aborto',
        criadoEm: em('2026-05-01T10:00:00Z'),
        cancelamento: ativo,
      },
    ]);
    partoRepository.find.mockResolvedValue([
      {
        id: 'p1',
        data: '2025-10-01',
        resultado: 'VIVO',
        tipo: 'NORMAL',
        criadoEm: em('2025-10-01T10:00:00Z'),
      },
    ]);

    const eventos = await service.historico('f1', 'v1');

    expect(eventos.map((e) => e.tipo)).toEqual([
      'PERDA',
      'DIAGNOSTICO',
      'INSEMINACAO',
      'EXPOSICAO',
      'PARTO',
    ]);
    expect(eventos[2]).toMatchObject({
      semen: 'Netuno',
      cancelado: true,
      motivoCancelamento: 'vaca errada',
    });
    expect(eventos[3]).toMatchObject({
      touroBrinco: '1',
      pasto: 'Monta',
      dataFim: '2026-03-10',
    });
    expect(eventos[0]).not.toHaveProperty('criadoEm');
  });

  it('exposição de estação cancelada aparece cancelada, com o motivo da estação', async () => {
    exposicaoRepository.find.mockResolvedValue([
      {
        id: 'x1',
        estacaoId: 'e1',
        dataInicio: '2026-01-10',
        criadoEm: em('2026-01-10T10:00:00Z'),
        estacao: {
          cancelamento: { cancelado: true, motivoCancelamento: 'touro errado' },
        },
        cancelamento: ativo,
      },
    ]);
    const [evento] = await service.historico('f1', 'v1');
    expect(evento).toMatchObject({
      cancelado: true,
      motivoCancelamento: 'touro errado',
    });
  });

  it('macho não tem histórico reprodutivo; outra fazenda → 404', async () => {
    animalRepository.findOneBy.mockResolvedValue({
      id: 'v1',
      fazendaId: 'f1',
      sexo: Sexo.M,
    });
    expect(await service.historico('f1', 'v1')).toEqual([]);

    animalRepository.findOneBy.mockResolvedValue({
      id: 'v1',
      fazendaId: 'f2',
      sexo: Sexo.F,
    });
    await expect(service.historico('f1', 'v1')).rejects.toThrow(
      NotFoundException,
    );
  });
});
