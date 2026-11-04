import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Insumo, TipoInsumo, UnidadeBase, UnidadeInsumo } from './entities/insumo.entity';
import { MotivoMovimento, MovimentoInsumo } from './entities/movimento-insumo.entity';
import { Silo } from './entities/silo.entity';
import { InsumosService } from './insumos.service';
import { MovimentosService } from './movimentos.service';
import { managerFalso } from './manager-falso.helper-spec';

const HOJE = '2026-11-04';

describe('Insumos, movimentos e estoque (spec 005, US1)', () => {
  let manager: ReturnType<typeof managerFalso>;
  let insumos: InsumosService;
  let movimentos: MovimentosService;

  const racao = () => ({
    id: 'i1',
    fazendaId: 'f1',
    nome: 'Ração 22%',
    tipo: TipoInsumo.RACAO,
    unidadeBase: UnidadeBase.KG,
    unidadeCompraId: 'u-saco',
    estoqueMinimoBase: 250,
    ativo: true,
    unidades: [
      { id: 'u-kg', nome: 'kg', fator: 1, ativa: true },
      { id: 'u-saco', nome: 'saco', fator: 25, ativa: true },
      { id: 'u-velho', nome: 'saco 30', fator: 30, ativa: false },
    ],
  });

  beforeEach(() => {
    manager = managerFalso();
    insumos = new InsumosService(manager as never);
    movimentos = new MovimentosService(manager as never);
    manager.dados.set(Insumo, [racao()]);
  });

  describe('insumos', () => {
    it('cria com as unidades padrão (kg e tonelada)', async () => {
      manager.dados.set(Insumo, []);
      const r = await insumos.criar('f1', 'u1', {
        nome: 'Sal mineral',
        tipo: TipoInsumo.SAL_MINERAL,
        unidadeBase: UnidadeBase.KG,
        estoqueMinimo: 100,
      });
      expect(r.estoqueMinimoBase).toBe(100);
      expect(manager.create).toHaveBeenCalledWith(UnidadeInsumo, expect.objectContaining({ nome: 'tonelada', fator: 1000 }));
    });

    it('nome repetido sem acento → 409; silagem fora de kg → 400', async () => {
      await expect(
        insumos.criar('f1', 'u1', { nome: 'racao 22%', tipo: TipoInsumo.RACAO, unidadeBase: UnidadeBase.KG }),
      ).rejects.toBeInstanceOf(ConflictException);
      await expect(
        insumos.criar('f1', 'u1', { nome: 'Silagem', tipo: TipoInsumo.SILAGEM, unidadeBase: UnidadeBase.LITRO }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('unidade nova com nome repetido → 409; outra fazenda → 404', async () => {
      await expect(insumos.criarUnidade('f1', 'u1', 'i1', { nome: 'Saco', fator: 50 })).rejects.toBeInstanceOf(
        ConflictException,
      );
      await expect(insumos.criarUnidade('f2', 'u1', 'i1', { nome: 'fardo', fator: 18 })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('estoque: base, unidade de compra, situação e reserva em silo fechado; dono vê o custo médio', async () => {
      manager.query.mockResolvedValue([{ insumo_id: 'i1', estoque: '1000.000' }]);
      manager.dados.set(Silo, [{ fazendaId: 'f1', insumoId: 'i1', toneladasEnsiladas: 2, abertura: null, encerramento: null }]);
      manager.dados.set(MovimentoInsumo, [
        { fazendaId: 'f1', insumoId: 'i1', tipo: 'ENTRADA', data: '2026-11-01', quantidadeBase: 1000, valorCentavos: 320000, cancelamento: { cancelado: false } },
      ]);
      const [dono] = await insumos.listar('f1', 'DONO', false, HOJE);
      expect(dono).toMatchObject({
        estoqueBase: 1000,
        estoqueNaCompra: { unidade: 'saco', quantidade: 40 },
        situacao: 'NORMAL',
        reservaSilosFechadosBase: 2000,
        custoMedioCentavosPorBase: 320,
      });
      const [func] = await insumos.listar('f1', 'FUNCIONARIO', false, HOJE);
      expect(JSON.stringify(func)).not.toMatch(/custo|valor/i);
    });

    it('estoque abaixo do mínimo e negativo', async () => {
      manager.query.mockResolvedValue([{ insumo_id: 'i1', estoque: '-5' }]);
      expect((await insumos.listar('f1', 'DONO', false, HOJE))[0].situacao).toBe('NEGATIVO');
      manager.query.mockResolvedValue([]);
      expect((await insumos.listar('f1', 'DONO', false, HOJE))[0].situacao).toBe('BAIXO');
    });
  });

  describe('entradas e baixas', () => {
    const entrada = { insumoId: 'i1', data: HOJE, quantidade: 40, unidadeId: 'u-saco', motivo: MotivoMovimento.COMPRA as const };

    it('converte para a base; compra sem valor fica aguardando preço', async () => {
      const r = await movimentos.entrada('f1', 'u1', 'FUNCIONARIO', entrada, HOJE);
      expect(r).toMatchObject({ quantidadeBase: 1000, aguardandoPreco: true });
    });

    it('dono com valor não fica aguardando; funcionário com valor → 403', async () => {
      await expect(
        movimentos.entrada('f1', 'u1', 'DONO', { ...entrada, valorCentavos: 320000 }, HOJE),
      ).resolves.toMatchObject({ aguardandoPreco: false });
      await expect(
        movimentos.entrada('f1', 'u1', 'FUNCIONARIO', { ...entrada, valorCentavos: 1 }, HOJE),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('produção própria sem valor não fica aguardando', async () => {
      await expect(
        movimentos.entrada('f1', 'u1', 'FUNCIONARIO', { ...entrada, motivo: MotivoMovimento.PRODUCAO }, HOJE),
      ).resolves.toMatchObject({ aguardandoPreco: false });
    });

    it('data futura, unidade desativada ou de outro insumo → 400', async () => {
      await expect(movimentos.entrada('f1', 'u1', 'DONO', { ...entrada, data: '2026-11-05' }, HOJE)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(movimentos.entrada('f1', 'u1', 'DONO', { ...entrada, unidadeId: 'u-velho' }, HOJE)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(movimentos.entrada('f1', 'u1', 'DONO', { ...entrada, unidadeId: 'outra' }, HOJE)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('baixa OUTRO sem observação → 400; perda grava', async () => {
      const baixa = { insumoId: 'i1', data: HOJE, quantidade: 2, unidadeId: 'u-saco' };
      await expect(movimentos.baixa('f1', 'u1', { ...baixa, motivo: MotivoMovimento.OUTRO }, HOJE)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(movimentos.baixa('f1', 'u1', { ...baixa, motivo: MotivoMovimento.PERDA }, HOJE)).resolves.toMatchObject({
        quantidadeBase: 50,
      });
    });

    it('cancelar avulsa com motivo; de fornecimento → 400; outra fazenda → 404', async () => {
      const avulsa = { id: 'm1', fazendaId: 'f1', motivo: MotivoMovimento.COMPRA, cancelamento: { cancelado: false } };
      manager.dados.set(MovimentoInsumo, [
        avulsa,
        { id: 'm2', fazendaId: 'f1', motivo: MotivoMovimento.FORNECIMENTO, cancelamento: { cancelado: false } },
      ]);
      await movimentos.cancelar('f1', 'u1', 'm1', 'Lançada errada');
      expect(avulsa.cancelamento).toMatchObject({ cancelado: true, motivoCancelamento: 'Lançada errada' });
      await expect(movimentos.cancelar('f1', 'u1', 'm2', 'x')).rejects.toBeInstanceOf(BadRequestException);
      await expect(movimentos.cancelar('f2', 'u1', 'm1', 'x')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
