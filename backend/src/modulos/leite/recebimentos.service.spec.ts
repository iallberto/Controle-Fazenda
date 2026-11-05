import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ganchosModulos } from '../../common/ganchos-modulos';
import { EntregaLeite } from './entities/entrega-leite.entity';
import { RecebimentoLeite } from './entities/recebimento-leite.entity';
import { RecebimentosService } from './recebimentos.service';
import { garantirMesAberto } from './mes-recebido';

const HOJE = '2026-11-10';
const ativa = { cancelado: false, motivoCancelamento: null };

describe('Recebimento do leite (spec 006, US1)', () => {
  const dados = new Map<unknown, Record<string, unknown>[]>();
  const manager = {
    find: jest.fn(async (e: unknown) => dados.get(e) ?? []),
    findOne: jest.fn(async (e: unknown, o: { where: Record<string, unknown> }) =>
      (dados.get(e) ?? []).find((x) =>
        Object.entries(o.where).every(([k, v]) =>
          k === 'cancelamento' ? !(x.cancelamento as { cancelado: boolean }).cancelado : x[k] === v,
        ),
      ) ?? null,
    ),
    create: jest.fn((_e: unknown, x: object) => ({ ...x })),
    save: jest.fn(async (x: object) => ({ id: 'rec-novo', ...x })),
    transaction: jest.fn(),
  };
  manager.transaction.mockImplementation((cb: (m: typeof manager) => unknown) => cb(manager));
  const service = new RecebimentosService(manager as never);
  const eventos: { evento: string; dados: unknown }[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
    dados.clear();
    eventos.length = 0;
    ganchosModulos.limpar();
    ganchosModulos.registrar('leiteRecebido', async (_m, d) => {
      eventos.push({ evento: 'leiteRecebido', dados: d });
    });
    ganchosModulos.registrar('leiteRecebimentoDesfeito', async (_m, d) => {
      eventos.push({ evento: 'desfeito', dados: d });
    });
    dados.set(EntregaLeite, [
      { id: 'e1', data: '2026-10-01', litros: 1240, precoLitroCentavos: 260, cancelamento: ativa },
      { id: 'e2', data: '2026-10-15', litros: 1180.5, precoLitroCentavos: 260, cancelamento: ativa },
      { id: 'e3', data: '2026-10-20', litros: 999, precoLitroCentavos: null, cancelamento: { cancelado: true } },
      { id: 'e4', data: '2026-10-28', litros: 1050.5, precoLitroCentavos: 260, cancelamento: ativa },
    ]);
  });

  it('previsto do mês: litros e total das entregas não canceladas', async () => {
    const r = await service.doMes('f1', '2026-10');
    expect(r.recebimento).toBeNull();
    expect(r.previsto).toMatchObject({ entregas: 3, litros: 3471, totalCalculadoCentavos: 902460, entregasSemPreco: [] });
  });

  it('confirmar com o valor calculado grava e avisa o Financeiro na transação', async () => {
    const r = await service.confirmar('f1', 'u1', { mes: '2026-10', data: HOJE }, HOJE);
    expect(r).toEqual({ id: 'rec-novo', valorRecebidoCentavos: 902460, diferencaCentavos: 0 });
    expect(manager.create).toHaveBeenCalledWith(
      RecebimentoLeite,
      expect.objectContaining({ mes: '2026-10', litros: 3471, totalCalculadoCentavos: 902460, valorRecebidoCentavos: 902460 }),
    );
    expect(eventos).toEqual([
      {
        evento: 'leiteRecebido',
        dados: expect.objectContaining({
          recebimentoId: 'rec-novo',
          valorCentavos: 902460,
          litros: 3471,
          caminho: '/modulos/leite/entregas?mes=2026-10',
        }),
      },
    ]);
  });

  it('valor recebido diferente guarda a diferença (bonificação)', async () => {
    const r = await service.confirmar('f1', 'u1', { mes: '2026-10', data: HOJE, valorRecebidoCentavos: 930000 }, HOJE);
    expect(r.diferencaCentavos).toBe(27540);
  });

  it('entrega sem preço → 400 ENTREGAS_SEM_PRECO com a lista; nada é avisado', async () => {
    dados.get(EntregaLeite)![0].precoLitroCentavos = null;
    const erro = await service.confirmar('f1', 'u1', { mes: '2026-10', data: HOJE }, HOJE).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(BadRequestException);
    expect((erro as BadRequestException).getResponse()).toMatchObject({
      codigo: 'ENTREGAS_SEM_PRECO',
      entregas: [{ id: 'e1', data: '2026-10-01', litros: 1240 }],
    });
    expect(eventos).toEqual([]);
  });

  it('data futura ou antes do mês → 400; mês já recebido → 409', async () => {
    await expect(service.confirmar('f1', 'u1', { mes: '2026-10', data: '2026-11-11' }, HOJE)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.confirmar('f1', 'u1', { mes: '2026-10', data: '2026-09-30' }, HOJE)).rejects.toBeInstanceOf(BadRequestException);
    dados.set(RecebimentoLeite, [{ id: 'r1', fazendaId: 'f1', mes: '2026-10', cancelamento: ativa }]);
    await expect(service.confirmar('f1', 'u1', { mes: '2026-10', data: HOJE }, HOJE)).rejects.toBeInstanceOf(ConflictException);
  });

  it('desfazer cancela com o motivo e avisa; outra fazenda → 404; duas vezes → 400', async () => {
    const recebimento = { id: 'r1', fazendaId: 'f1', mes: '2026-10', cancelamento: { ...ativa } };
    dados.set(RecebimentoLeite, [recebimento]);
    await expect(service.desfazer('f2', 'u1', 'r1', 'x')).rejects.toBeInstanceOf(NotFoundException);
    await service.desfazer('f1', 'u1', 'r1', 'Valor errado');
    expect(recebimento.cancelamento).toMatchObject({ cancelado: true, motivoCancelamento: 'Valor errado' });
    expect(eventos).toEqual([{ evento: 'desfeito', dados: expect.objectContaining({ recebimentoId: 'r1', motivo: 'Valor errado' }) }]);
    manager.findOne.mockResolvedValueOnce(recebimento as never);
    await expect(service.desfazer('f1', 'u1', 'r1', 'x')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('trava: mês recebido → 409 MES_RECEBIDO; mês aberto passa', async () => {
    dados.set(RecebimentoLeite, [{ id: 'r1', fazendaId: 'f1', mes: '2026-10', cancelamento: ativa }]);
    const erro = await garantirMesAberto(manager as never, 'f1', ['2026-10-05']).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ConflictException);
    expect((erro as ConflictException).getResponse()).toMatchObject({ codigo: 'MES_RECEBIDO' });
    await expect(garantirMesAberto(manager as never, 'f1', ['2026-11-05'])).resolves.toBeUndefined();
  });
});
