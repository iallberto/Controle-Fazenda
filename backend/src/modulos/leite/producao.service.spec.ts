import { BadRequestException } from '@nestjs/common';
import {
  curvaDaLactacao,
  linhaDeProducao,
  periodoDiario,
  periodoMensal,
} from './dominio/producao';
import { ProducaoService } from './producao.service';
import { Lactacao } from './entities/lactacao.entity';
import { Ordenha } from './entities/ordenha.entity';

const HOJE = '2026-11-04';

describe('Relatórios de produção (spec 004, US5)', () => {
  describe('regras puras', () => {
    it('período diário: padrão do dia 1 até hoje; no máximo 92 dias', () => {
      expect(periodoDiario(HOJE)).toEqual({ de: '2026-11-01', ate: HOJE });
      expect(() => periodoDiario(HOJE, '2026-01-01', HOJE)).toThrow(BadRequestException);
      expect(() => periodoDiario(HOJE, '2026-11-05', HOJE)).toThrow(BadRequestException);
    });

    it('período mensal: padrão 12 meses; no máximo 36', () => {
      expect(periodoMensal(HOJE)).toEqual({ de: '2025-12', ate: '2026-11' });
      expect(() => periodoMensal(HOJE, '2023-01', '2026-11')).toThrow(BadRequestException);
      expect(periodoMensal(HOJE, '2023-12', '2026-11')).toEqual({ de: '2023-12', ate: '2026-11' });
    });

    it('linha: total, descarte separado e média por vaca-dia', () => {
      expect(linhaDeProducao(100, 20, 6)).toEqual({
        paraTanque: 100,
        descartado: 20,
        total: 120,
        mediaPorVaca: 20,
      });
      expect(linhaDeProducao(0, 0, 0).mediaPorVaca).toBeNull();
    });

    it('curva: um ponto por DEL, dias sem ordenha vazios', () => {
      const pontos = curvaDaLactacao(
        '2026-11-01',
        '2026-11-03',
        new Map([
          ['2026-11-01', { litros: 10, descarte: false }],
          ['2026-11-03', { litros: 22.55, descarte: true }],
        ]),
      );
      expect(pontos).toEqual([
        { data: '2026-11-01', del: 0, litros: 10, descarte: false },
        { data: '2026-11-02', del: 1, litros: null, descarte: false },
        { data: '2026-11-03', del: 2, litros: 22.6, descarte: true },
      ]);
    });
  });

  describe('ProducaoService', () => {
    const manager = { query: jest.fn(), find: jest.fn() };
    const vacas = { buscarFemea: jest.fn(), detalhar: jest.fn() };
    const service = new ProducaoService(manager as never, vacas as never);

    beforeEach(() => jest.clearAllMocks());

    it('diária: converte os números do SQL e soma os totais', async () => {
      manager.query.mockResolvedValue([
        { data: '2026-11-01', para_tanque: '100.0', descartado: '0', vacas: '5' },
        { data: '2026-11-02', para_tanque: '90.5', descartado: '9.5', vacas: '5' },
      ]);
      const r = await service.diaria('f1', '2026-11-01', '2026-11-02', HOJE);
      expect(manager.query).toHaveBeenCalledWith(expect.stringContaining('generate_series'), [
        'f1',
        '2026-11-01',
        '2026-11-02',
      ]);
      expect(r.dias[1]).toEqual({
        data: '2026-11-02',
        vacasEmLactacao: 5,
        paraTanque: 90.5,
        descartado: 9.5,
        total: 100,
        mediaPorVaca: 20,
      });
      expect(r.totais).toEqual({ paraTanque: 190.5, descartado: 9.5, total: 200, mediaPorVaca: 20 });
    });

    it('mensal: agrupa os dias por mês, com meses sem ordenha zerados, até hoje', async () => {
      manager.query.mockResolvedValue([
        { data: '2026-10-31', para_tanque: '50', descartado: '0', vacas: '2' },
        { data: '2026-11-01', para_tanque: '40', descartado: '4', vacas: '2' },
        { data: '2026-11-02', para_tanque: '40', descartado: '0', vacas: '2' },
      ]);
      const r = await service.mensal('f1', '2026-09', '2026-11', HOJE);
      expect(manager.query.mock.calls[0][1]).toEqual(['f1', '2026-09-01', HOJE]);
      expect(r.meses).toEqual([
        { mes: '2026-09', paraTanque: 0, descartado: 0, total: 0, mediaPorVaca: null },
        { mes: '2026-10', paraTanque: 50, descartado: 0, total: 50, mediaPorVaca: 25 },
        { mes: '2026-11', paraTanque: 80, descartado: 4, total: 84, mediaPorVaca: 21 },
      ]);
    });

    it('curva: lactação aberta por padrão, litros somados por dia', async () => {
      manager.find.mockImplementation(async (entidade: unknown) =>
        entidade === Lactacao
          ? [
              { id: 'l2', inicio: '2026-11-02', fim: null },
              { id: 'l1', inicio: '2026-01-01', fim: '2026-09-01' },
            ]
          : entidade === Ordenha
            ? [
                { data: '2026-11-02', litros: 10, descarte: false },
                { data: '2026-11-02', litros: 8, descarte: false },
                { data: '2026-11-04', litros: 9, descarte: true },
              ]
            : [],
      );
      const r = await service.curva('f1', 'v1', undefined, HOJE);
      expect(vacas.buscarFemea).toHaveBeenCalledWith('f1', 'v1');
      expect(r.lactacaoId).toBe('l2');
      expect(r.pontos.map((p) => [p.del, p.litros, p.descarte])).toEqual([
        [0, 18, false],
        [1, null, false],
        [2, 9, true],
      ]);
    });
  });
});
