import { BadRequestException, ConflictException } from '@nestjs/common';
import { Fazenda } from '../../fazenda/entities/fazenda.entity';
import { ModuloFazenda } from '../acesso/entities/modulo-fazenda.entity';
import { PrecoPlano } from './entities/preco-plano.entity';
import { RegistroAcesso } from './entities/registro-acesso.entity';
import { PrazoFazendasService } from './prazo-fazendas.service';

describe('PrazoFazendasService (spec 008, US3)', () => {
  const HOJE = '2026-11-10';
  let fazenda: Record<string, unknown>;
  let periodos: Record<string, unknown>[];
  const precos = [
    { item: 'PACOTE_INICIAL', valorCentavos: 15000 },
    { item: 'LEITE', valorCentavos: 5000 },
    { item: 'FINANCEIRO', valorCentavos: 4000 },
    { item: 'NUTRICAO', valorCentavos: 3000 },
  ];
  const manager = {
    findOne: jest.fn(async (entidade: unknown, opcoes: { where: Record<string, unknown> }) => {
      if (entidade === Fazenda) return fazenda;
      if (entidade === ModuloFazenda) {
        return periodos.find((p) => p.modulo === opcoes.where.modulo && !p.desativadoEm) ?? null;
      }
      return null;
    }),
    find: jest.fn(async (entidade: unknown) => (entidade === PrecoPlano ? precos : [])),
    save: jest.fn(async (x: object) => x),
    update: jest.fn(async (_e: unknown, criterio: { id: string }, valores: object) => {
      const p = periodos.find((x) => x.id === criterio.id);
      if (p) Object.assign(p, valores);
    }),
    insert: jest.fn(async (entidade: unknown, valores: Record<string, unknown>) => {
      if (entidade === ModuloFazenda) periodos.push({ id: `p${periodos.length + 1}`, ...valores });
    }),
  };
  const fazendaRepo = {
    manager: { ...manager, transaction: jest.fn((cb: (m: typeof manager) => unknown) => cb(manager)) },
    findOneBy: jest.fn(async () => fazenda),
    find: jest.fn(),
    save: jest.fn(async (x: object) => x),
  };
  const usuarioRepo = { findOne: jest.fn() };
  const registroRepo = { find: jest.fn(async () => []) };
  const precoRepo = { find: jest.fn(async () => precos), save: jest.fn() };
  const acessoModulos = { limparCache: jest.fn() };
  const service = new PrazoFazendasService(
    fazendaRepo as never,
    usuarioRepo as never,
    registroRepo as never,
    precoRepo as never,
    acessoModulos as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    fazenda = { id: 'f1', nome: 'Fazenda Cliente', semPrazo: false, acessoAte: null, modulosPlano: [], telefoneContato: null };
    periodos = [];
  });

  it('teste de 30 dias: prazo, módulos escolhidos até o fim da carência e registro', async () => {
    const r = await service.liberarTeste('a1', 'f1', ['LEITE'] as never, HOJE);
    expect(fazenda).toMatchObject({ acessoAte: '2026-12-10', modulosPlano: ['LEITE'] });
    expect(periodos).toEqual([expect.objectContaining({ modulo: 'LEITE', dataInicio: HOJE, dataTermino: '2026-12-12' })]);
    expect(manager.insert).toHaveBeenCalledWith(RegistroAcesso, expect.objectContaining({ tipo: 'TESTE', ate: '2026-12-10' }));
    expect(r).toMatchObject({ situacao: 'EM_DIA', valorCentavos: 20000 });
    expect(acessoModulos.limparCache).toHaveBeenCalledWith('f1');
  });

  it('teste numa fazenda que já tem prazo ou é sem prazo: 409', async () => {
    fazenda.acessoAte = '2026-12-01';
    await expect(service.liberarTeste('a1', 'f1', [], HOJE)).rejects.toBeInstanceOf(ConflictException);
    fazenda.acessoAte = null;
    fazenda.semPrazo = true;
    await expect(service.liberarTeste('a1', 'f1', [], HOJE)).rejects.toBeInstanceOf(ConflictException);
  });

  it('pagamento em dia: +30 a partir do fim atual, estende o módulo e grava o valor do plano', async () => {
    fazenda.acessoAte = '2026-11-14';
    fazenda.modulosPlano = ['LEITE'];
    periodos = [{ id: 'p1', modulo: 'LEITE', dataInicio: '2026-10-15', dataTermino: '2026-11-16', desativadoEm: null }];
    await service.confirmarPagamento('a1', 'f1', undefined, HOJE);
    expect(fazenda.acessoAte).toBe('2026-12-14');
    expect(periodos[0].dataTermino).toBe('2026-12-16');
    expect(manager.insert).toHaveBeenCalledWith(
      RegistroAcesso,
      expect.objectContaining({ tipo: 'PAGAMENTO', de: '2026-11-14', ate: '2026-12-14', valorCentavos: 20000 }),
    );
  });

  it('pagamento depois de vencido: +30 a partir de hoje e novo período do módulo', async () => {
    fazenda.acessoAte = '2026-11-01';
    fazenda.modulosPlano = ['LEITE'];
    periodos = [{ id: 'p1', modulo: 'LEITE', dataInicio: '2026-10-02', dataTermino: '2026-11-03', desativadoEm: null }];
    await service.confirmarPagamento('a1', 'f1', 18000, HOJE);
    expect(fazenda.acessoAte).toBe('2026-12-10');
    expect(periodos[1]).toMatchObject({ modulo: 'LEITE', dataInicio: HOJE, dataTermino: '2026-12-12' });
    expect(manager.insert).toHaveBeenCalledWith(RegistroAcesso, expect.objectContaining({ valorCentavos: 18000 }));
  });

  it('pagamento sem teste liberado: 400; cliente sem prazo: 409', async () => {
    await expect(service.confirmarPagamento('a1', 'f1', undefined, HOJE)).rejects.toBeInstanceOf(BadRequestException);
    fazenda.semPrazo = true;
    await expect(service.confirmarPagamento('a1', 'f1', undefined, HOJE)).rejects.toBeInstanceOf(ConflictException);
  });

  it('cliente sem prazo: módulos do plano sem término', async () => {
    fazenda.acessoAte = '2026-11-20';
    fazenda.modulosPlano = ['LEITE'];
    periodos = [{ id: 'p1', modulo: 'LEITE', dataInicio: '2026-10-21', dataTermino: '2026-11-22', desativadoEm: null }];
    await service.tornarSemPrazo('a1', 'f1', HOJE);
    expect(fazenda.semPrazo).toBe(true);
    expect(periodos[0].dataTermino).toBeNull();
  });

  it('estender para o passado: 400', async () => {
    await expect(service.estenderPrazo('a1', 'f1', '2026-11-01', HOJE)).rejects.toBeInstanceOf(BadRequestException);
  });
});
