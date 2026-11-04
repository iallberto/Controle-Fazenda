import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EntregaLeite } from './entities/entrega-leite.entity';
import { Ordenha } from './entities/ordenha.entity';
import { AnaliseLeite } from './entities/analise-leite.entity';
import { EntregasService, limitesDoMes, valorDaEntrega } from './entregas.service';
import { AnalisesService } from './analises.service';

const HOJE = '2026-11-04';
const semCancelar = { cancelado: false, motivoCancelamento: null };

describe('Entregas e análises (spec 004, US4)', () => {
  const dados = new Map<unknown, unknown[]>();
  const manager = {
    find: jest.fn(async (entidade: unknown) => dados.get(entidade) ?? []),
    findOne: jest.fn(async (entidade: unknown, opcoes: { where: { id: string } }) =>
      ((dados.get(entidade) ?? []) as { id: string }[]).find((x) => x.id === opcoes.where.id) ?? null,
    ),
    create: jest.fn((_e: unknown, x: object) => ({ ...x })),
    save: jest.fn(async (x: object) => ({ id: 'novo', ...x })),
  };
  const entregas = new EntregasService(manager as never);
  const analises = new AnalisesService(manager as never);

  beforeEach(() => {
    jest.clearAllMocks();
    dados.clear();
    dados.set(EntregaLeite, [
      { id: 'e1', fazendaId: 'f1', data: '2026-11-01', litros: 1240, precoLitroCentavos: 245, observacao: null, cancelamento: semCancelar },
      { id: 'e2', fazendaId: 'f1', data: '2026-11-03', litros: 1180.5, precoLitroCentavos: null, observacao: null, cancelamento: semCancelar },
      { id: 'e3', fazendaId: 'f1', data: '2026-11-02', litros: 999, precoLitroCentavos: 245, observacao: null, cancelamento: { cancelado: true, motivoCancelamento: 'Lançada duas vezes' } },
    ]);
    dados.set(Ordenha, [{ litros: 1300 }, { litros: 1150 }]);
  });

  it('limitesDoMes e valorDaEntrega', () => {
    expect(limitesDoMes('2026-02')).toEqual({ de: '2026-02-01', ate: '2026-02-28' });
    expect(valorDaEntrega(1180.5, 245)).toBe(289223);
    expect(valorDaEntrega(10, null)).toBeNull();
  });

  describe('listar (FR-023)', () => {
    it('dono: total entregue × leite para o tanque, diferença e valores; canceladas fora dos totais', async () => {
      const r = (await entregas.listar('f1', 'DONO', '2026-11')) as Record<string, unknown>;
      expect(r).toMatchObject({
        totalLitros: 2420.5,
        paraTanque: 2450,
        diferenca: 29.5,
        totalCentavos: 303800,
        entregasSemPreco: 1,
      });
      expect((r.entregas as Record<string, unknown>[])[0]).toMatchObject({ valorCentavos: 303800 });
    });

    it('funcionário: nenhum campo de dinheiro', async () => {
      const r = await entregas.listar('f1', 'FUNCIONARIO', '2026-11');
      const texto = JSON.stringify(r);
      expect(texto).not.toMatch(/Centavos|preco/i);
      expect(r.totalLitros).toBe(2420.5);
    });
  });

  describe('criar, corrigir e cancelar', () => {
    it('funcionário lança litros; com preço → 403', async () => {
      await expect(
        entregas.criar('f1', 'u1', 'FUNCIONARIO', { data: HOJE, litros: 1000 }, HOJE),
      ).resolves.toMatchObject({ litros: 1000 });
      await expect(
        entregas.criar('f1', 'u1', 'FUNCIONARIO', { data: HOJE, litros: 1000, precoLitroCentavos: 250 }, HOJE),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('data futura → 400; entrega de outra fazenda → 404; cancelada não muda', async () => {
      await expect(
        entregas.criar('f1', 'u1', 'DONO', { data: '2026-11-05', litros: 10 }, HOJE),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(entregas.editar('f2', 'u1', 'e1', { litros: 1 })).rejects.toBeInstanceOf(NotFoundException);
      await expect(entregas.cancelar('f1', 'u1', 'e3', 'x')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('cancelar guarda o motivo e quem cancelou', async () => {
      await entregas.cancelar('f1', 'u1', 'e1', 'Errada');
      expect(manager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'e1',
          cancelamento: expect.objectContaining({ cancelado: true, motivoCancelamento: 'Errada', canceladoPorId: 'u1' }),
        }),
      );
    });

    it('preço do mês vale para as entregas não canceladas do mês', async () => {
      const lista = [
        { id: 'e1', precoLitroCentavos: 245 },
        { id: 'e2', precoLitroCentavos: null },
      ];
      manager.find.mockResolvedValueOnce(lista);
      const r = await entregas.informarPrecoDoMes('f1', 'u1', '2026-11', 260);
      expect(r).toEqual({ atualizadas: 2 });
      expect(lista.every((e) => e.precoLitroCentavos === 260)).toBe(true);
    });
  });

  describe('análises (FR-024)', () => {
    it('grava a análise do mês', async () => {
      await analises.criar('f1', 'u1', { mes: '2026-10', ccsMil: 350, cbtMil: 80, gordura: 3.6, proteina: 3.2 });
      expect(manager.create).toHaveBeenCalledWith(
        AnaliseLeite,
        expect.objectContaining({ mes: '2026-10', ccsMil: 350, gordura: 3.6, entregaId: null }),
      );
    });

    it('sem nenhum valor → 400', async () => {
      await expect(analises.criar('f1', 'u1', { mes: '2026-10' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('da entrega: entrega da fazenda e do mesmo mês', async () => {
      await expect(
        analises.criar('f1', 'u1', { mes: '2026-10', entregaId: 'e1', ccsMil: 1 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        analises.criar('f2', 'u1', { mes: '2026-11', entregaId: 'e1', ccsMil: 1 }),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        analises.criar('f1', 'u1', { mes: '2026-11', entregaId: 'e1', ccsMil: 1 }),
      ).resolves.toMatchObject({ mes: '2026-11' });
    });
  });
});
