import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Animal, StatusAnimal } from '../../animal/entities/animal.entity';
import { Dieta } from './entities/dieta.entity';
import { Insumo } from './entities/insumo.entity';
import { LoteAlimentacao, LoteAnimal } from './entities/lote-alimentacao.entity';
import { Fornecimento, ItemFornecimento } from './entities/fornecimento.entity';
import { MotivoMovimento, MovimentoInsumo, TipoMovimento } from './entities/movimento-insumo.entity';
import { Silo } from './entities/silo.entity';
import { LotesService } from './lotes.service';
import { DietasService } from './dietas.service';
import { FornecimentosService } from './fornecimentos.service';
import { managerFalso } from './manager-falso.helper-spec';

const HOJE = '2026-11-04';

describe('Lotes, dietas e fornecimento (spec 005, US2)', () => {
  let manager: ReturnType<typeof managerFalso>;
  let lotes: LotesService;
  let dietas: DietasService;
  let fornecimentos: FornecimentosService;

  const insumo = (id: string, nome: string, extra = {}) => ({
    id,
    fazendaId: 'f1',
    nome,
    ativo: true,
    unidades: [
      { id: `${id}-kg`, nome: 'kg', fator: 1, ativa: true },
      { id: `${id}-t`, nome: 'tonelada', fator: 1000, ativa: true },
    ],
    ...extra,
  });

  beforeEach(() => {
    manager = managerFalso();
    lotes = new LotesService(manager as never);
    dietas = new DietasService(manager as never);
    fornecimentos = new FornecimentosService(manager as never, lotes, { custoDosFornecimentos: jest.fn(async () => new Map()) } as never);
    manager.dados.set(LoteAlimentacao, [{ id: 'l1', fazendaId: 'f1', nome: 'Lactação', dietaId: 'd1', ativo: true }]);
    manager.dados.set(Insumo, [insumo('silagem', 'Silagem'), insumo('racao', 'Ração'), insumo('sal', 'Sal')]);
    // 20 animais no lote desde outubro; um saiu ontem
    manager.dados.set(LoteAnimal, [
      ...Array.from({ length: 20 }, (_, i) => ({ loteId: 'l1', animalId: `a${i}`, entrada: '2026-10-01', saida: null })),
      { loteId: 'l1', animalId: 'a99', entrada: '2026-10-01', saida: '2026-11-03' },
    ]);
  });

  describe('lotes', () => {
    it('incluir tira o animal do lote anterior na data', async () => {
      const anterior = { loteId: 'l0', animalId: 'x1', entrada: '2026-09-01', saida: null as string | null };
      manager.dados.set(LoteAnimal, [anterior]);
      manager.dados.set(Animal, [{ id: 'x1', fazendaId: 'f1', status: StatusAnimal.ATIVO, brinco: '7' }]);
      const r = await lotes.incluir('f1', 'u1', 'l1', ['x1'], HOJE, HOJE);
      expect(r).toEqual({ incluidos: 1 });
      expect(anterior.saida).toBe(HOJE);
      expect(manager.create).toHaveBeenCalledWith(
        LoteAnimal,
        expect.objectContaining({ loteId: 'l1', animalId: 'x1', entrada: HOJE, incluidoPorId: 'u1' }),
      );
    });

    it('animal fora do rebanho → 400; de outra fazenda → 404; data futura → 400', async () => {
      manager.dados.set(Animal, [
        { id: 'v', fazendaId: 'f1', status: StatusAnimal.VENDIDO, brinco: '1' },
        { id: 'o', fazendaId: 'f2', status: StatusAnimal.ATIVO, brinco: '2' },
      ]);
      await expect(lotes.incluir('f1', 'u1', 'l1', ['v'], HOJE, HOJE)).rejects.toBeInstanceOf(BadRequestException);
      await expect(lotes.incluir('f1', 'u1', 'l1', ['o'], HOJE, HOJE)).rejects.toBeInstanceOf(NotFoundException);
      await expect(lotes.incluir('f1', 'u1', 'l1', ['v'], '2026-11-05', HOJE)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('animais no lote na data', async () => {
      expect(await lotes.animaisNaData('l1', HOJE)).toBe(20);
      expect(await lotes.animaisNaData('l1', '2026-11-02')).toBe(21);
    });
  });

  describe('dietas', () => {
    it('insumo repetido → 400; unidade de outro insumo → 400', async () => {
      await expect(
        dietas.criar('f1', 'u1', {
          nome: 'X',
          itens: [
            { insumoId: 'sal', quantidadePorAnimal: 0.1, unidadeId: 'sal-kg' },
            { insumoId: 'sal', quantidadePorAnimal: 0.2, unidadeId: 'sal-kg' },
          ],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        dietas.criar('f1', 'u1', { nome: 'X', itens: [{ insumoId: 'sal', quantidadePorAnimal: 0.1, unidadeId: 'racao-kg' }] }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('fornecimento', () => {
    beforeEach(() => {
      manager.dados.set(Dieta, [
        {
          id: 'd1',
          nome: 'Lactação',
          ativa: true,
          itens: [
            { insumoId: 'silagem', insumo: insumo('silagem', 'Silagem'), quantidadePorAnimal: 25, unidadeId: 'silagem-kg', unidade: { nome: 'kg', fator: 1 } },
            { insumoId: 'racao', insumo: insumo('racao', 'Ração'), quantidadePorAnimal: 4, unidadeId: 'racao-kg', unidade: { nome: 'kg', fator: 1 } },
            { insumoId: 'sal', insumo: insumo('sal', 'Sal'), quantidadePorAnimal: 0.15, unidadeId: 'sal-kg', unidade: { nome: 'kg', fator: 1 } },
          ],
        },
      ]);
      manager.query.mockResolvedValue([
        { insumo_id: 'silagem', estoque: '10000' },
        { insumo_id: 'racao', estoque: '1000' },
        { insumo_id: 'sal', estoque: '50' },
      ]);
    });

    it('sugestão = dieta × animais no lote na data (data passada usa os animais daquele dia)', async () => {
      const r = await fornecimentos.sugestao('f1', 'l1', HOJE);
      expect(r.animais).toBe(20);
      // Ordenados pelo nome do insumo
      expect(r.itens.map((i) => [i.insumo, i.quantidade])).toEqual([
        ['Ração', 80],
        ['Sal', 3],
        ['Silagem', 500],
      ]);
      expect((await fornecimentos.sugestao('f1', 'l1', '2026-11-02')).itens[2].quantidade).toBe(525);
    });

    it('gravar: fornecimento, itens e uma baixa por item, guardando os animais do dia', async () => {
      const r = await fornecimentos.gravar(
        'f1',
        'u1',
        {
          loteId: 'l1',
          data: HOJE,
          itens: [
            { insumoId: 'silagem', quantidade: 480, unidadeId: 'silagem-kg' },
            { insumoId: 'racao', quantidade: 0.08, unidadeId: 'racao-t' },
          ],
        },
        HOJE,
      );
      expect(r).toMatchObject({ animais: 20, estoqueNegativo: [] });
      expect(manager.create).toHaveBeenCalledWith(Fornecimento, expect.objectContaining({ animais: 20, dietaId: 'd1' }));
      expect(manager.create).toHaveBeenCalledWith(ItemFornecimento, expect.objectContaining({ insumoId: 'racao', quantidadeBase: 80 }));
      const baixas = manager.create.mock.calls.filter(([e]) => e === MovimentoInsumo).map(([, x]) => x);
      expect(baixas).toEqual([
        expect.objectContaining({ tipo: TipoMovimento.BAIXA, motivo: MotivoMovimento.FORNECIMENTO, quantidadeBase: 480 }),
        expect.objectContaining({ quantidadeBase: 80 }),
      ]);
    });

    it('estoque negativo → 409 ESTOQUE_NEGATIVO; com confirmação, grava', async () => {
      const dto = { loteId: 'l1', data: HOJE, itens: [{ insumoId: 'sal', quantidade: 60, unidadeId: 'sal-kg' }] };
      const erro = await fornecimentos.gravar('f1', 'u1', dto, HOJE).catch((e: unknown) => e);
      expect(erro).toBeInstanceOf(ConflictException);
      expect((erro as ConflictException).getResponse()).toMatchObject({
        codigo: 'ESTOQUE_NEGATIVO',
        insumos: [expect.objectContaining({ nome: 'Sal', depoisBase: -10 })],
      });
      await expect(
        fornecimentos.gravar('f1', 'u1', { ...dto, confirmarNegativo: true }, HOJE),
      ).resolves.toMatchObject({ estoqueNegativo: ['Sal'] });
    });

    it('data futura → 400; lote de outra fazenda → 404; silo fechado → 400', async () => {
      const item = { insumoId: 'silagem', quantidade: 10, unidadeId: 'silagem-kg' };
      await expect(
        fornecimentos.gravar('f1', 'u1', { loteId: 'l1', data: '2026-11-05', itens: [item] }, HOJE),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        fornecimentos.gravar('f2', 'u1', { loteId: 'l1', data: HOJE, itens: [item] }, HOJE),
      ).rejects.toBeInstanceOf(NotFoundException);
      manager.dados.set(Silo, [{ id: 's1', fazendaId: 'f1', insumoId: 'silagem', abertura: null, encerramento: null }]);
      await expect(
        fornecimentos.gravar('f1', 'u1', { loteId: 'l1', data: HOJE, itens: [{ ...item, siloId: 's1' }] }, HOJE),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('cancelar devolve ao estoque cancelando as baixas', async () => {
      const baixa = { id: 'm1', fornecimentoItemId: 'it1', cancelamento: { cancelado: false } };
      manager.dados.set(Fornecimento, [
        { id: 'fo1', fazendaId: 'f1', cancelamento: { cancelado: false }, itens: [{ id: 'it1' }] },
      ]);
      manager.dados.set(MovimentoInsumo, [baixa]);
      await fornecimentos.cancelar('f1', 'u1', 'fo1', 'Lote errado');
      expect(baixa.cancelamento).toMatchObject({ cancelado: true, motivoCancelamento: 'Lote errado' });
      expect(manager.update).toHaveBeenCalledWith(
        Fornecimento,
        { id: 'fo1' },
        expect.objectContaining({ cancelamento: expect.objectContaining({ cancelado: true }) }),
      );
    });
  });
});
