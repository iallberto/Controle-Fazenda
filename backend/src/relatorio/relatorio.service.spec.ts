import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RelatorioService } from './relatorio.service';
import { Animal } from '../animal/entities/animal.entity';
import { Parto } from '../parto/entities/parto.entity';
import { Tratamento } from '../tratamento/entities/tratamento.entity';
import { SituacaoService } from '../reproducao/situacao.service';
import { IndicadoresService } from '../reproducao/indicadores.service';

describe('RelatorioService', () => {
  let service: RelatorioService;

  const mockRepository = {
    createQueryBuilder: jest.fn(),
    find: jest.fn(),
  };
  const situacaoService = { previsoesParto: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RelatorioService,
        { provide: getRepositoryToken(Animal), useValue: mockRepository },
        { provide: getRepositoryToken(Parto), useValue: mockRepository },
        { provide: getRepositoryToken(Tratamento), useValue: mockRepository },
        { provide: SituacaoService, useValue: situacaoService },
        { provide: IndicadoresService, useValue: {} },
      ],
    }).compile();

    service = module.get<RelatorioService>(RelatorioService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('vacasAParir', () => {
    beforeEach(() => {
      jest.useFakeTimers({ now: new Date('2026-11-03T12:00:00') });
    });
    afterEach(() => jest.useRealTimers());

    it('lista as prenhes com previsão até a janela, em ordem, marcando as atrasadas', async () => {
      mockRepository.find.mockResolvedValue([
        {
          id: 'a',
          brinco: '2',
          categoria: 'MATRIZ',
          pastoAtual: { nome: 'Pasto Monta' },
        },
        { id: 'b', brinco: '4', categoria: 'MATRIZ', pastoAtual: null },
        { id: 'c', brinco: '5', categoria: 'NOVILHA', pastoAtual: null },
      ]);
      situacaoService.previsoesParto.mockResolvedValue(
        new Map([
          [
            'a',
            { data: '2026-11-20', base: 'TOQUE', touros: ['1'], semens: [] },
          ],
          [
            'b',
            { data: '2026-10-30', base: 'ESTACAO', touros: ['1'], semens: [] },
          ],
          // fora da janela de 30 dias
          [
            'c',
            { data: '2027-02-01', base: 'ESTACAO', touros: [], semens: [] },
          ],
        ]),
      );

      const resultado = await service.vacasAParir('f1', 30);

      expect(resultado.map((item) => item.animal.brinco)).toEqual(['4', '2']);
      expect(resultado[0]).toMatchObject({ atrasado: true, base: 'ESTACAO' });
      expect(resultado[1]).toMatchObject({
        atrasado: false,
        pasto: 'Pasto Monta',
        touros: ['1'],
      });
    });
  });
});
