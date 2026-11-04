import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Between, EntityManager, In, IsNull } from 'typeorm';
import { hojeLocal } from '../../common/datas';
import { Dieta } from './entities/dieta.entity';
import { Insumo } from './entities/insumo.entity';
import { Fornecimento, ItemFornecimento } from './entities/fornecimento.entity';
import { MotivoMovimento, MovimentoInsumo, TipoMovimento } from './entities/movimento-insumo.entity';
import { Silo } from './entities/silo.entity';
import { daBase, paraBase, sugestao } from './dominio/regras';
import { estoques, unidadeDoInsumo } from './estoque-base';
import { LotesService } from './lotes.service';
import { FornecimentoDto } from './dto/nutricao.dto';

// Fornecimento do dia (spec 005, US2, FR-011 a FR-015; research R5)
@Injectable()
export class FornecimentosService {
  constructor(
    @InjectEntityManager() private readonly manager: EntityManager,
    private readonly lotesService: LotesService,
  ) {}

  // Quantidades sugeridas = dieta × animais no lote na data, com estoque e
  // silos abertos de cada insumo
  async sugestao(fazendaId: string, loteId: string, data = hojeLocal()) {
    const lote = await this.lotesService.buscar(fazendaId, loteId);
    const [animais, dieta, saldo, silos] = await Promise.all([
      this.lotesService.animaisNaData(loteId, data),
      lote.dietaId
        ? this.manager.findOne(Dieta, {
            where: { id: lote.dietaId },
            relations: { itens: { insumo: { unidades: true }, unidade: true } },
          })
        : Promise.resolve(null),
      estoques(this.manager, fazendaId),
      this.silosAbertos(fazendaId),
    ]);
    // Ordem estável na tela: pelo nome do insumo
    const itens = (dieta?.itens ?? [])
      .filter((i) => i.insumo?.ativo)
      .sort((a, b) => a.insumo!.nome.localeCompare(b.insumo!.nome, 'pt-BR'))
      .map((i) => {
        const estoqueBase = saldo.get(i.insumoId) ?? 0;
        const daInsumo = silos.filter((s) => s.insumoId === i.insumoId);
        return {
          insumoId: i.insumoId,
          insumo: i.insumo!.nome,
          unidadeId: i.unidadeId,
          unidade: i.unidade?.nome ?? '',
          quantidadePorAnimal: i.quantidadePorAnimal,
          quantidade: sugestao(i.quantidadePorAnimal, animais),
          estoqueBase,
          estoqueNaUnidade: i.unidade ? daBase(estoqueBase, i.unidade.fator) : null,
          silos: daInsumo.map((s) => ({ id: s.id, nome: s.nome, abertura: s.abertura })),
          siloSugeridoId: daInsumo[0]?.id ?? null,
        };
      });
    return {
      lote: { id: lote.id, nome: lote.nome },
      data,
      animais,
      dieta: dieta ? { id: dieta.id, nome: dieta.nome, ativa: dieta.ativa } : null,
      itens,
    };
  }

  async gravar(fazendaId: string, usuarioId: string, dto: FornecimentoDto, hoje = hojeLocal()) {
    if (dto.data > hoje) throw new BadRequestException('O fornecimento não pode ser no futuro');
    const lote = await this.lotesService.buscar(fazendaId, dto.loteId);
    const ids = dto.itens.map((i) => i.insumoId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Cada insumo entra uma vez só no fornecimento');
    }
    const [insumos, silos, saldo, animais] = await Promise.all([
      this.manager.find(Insumo, { where: { id: In(ids) }, relations: { unidades: true } }),
      this.silosAbertos(fazendaId),
      estoques(this.manager, fazendaId),
      this.lotesService.animaisNaData(lote.id, dto.data),
    ]);

    const itens = dto.itens.map((item) => {
      const insumo = insumos.find((i) => i.id === item.insumoId);
      if (!insumo || insumo.fazendaId !== fazendaId) throw new NotFoundException('Insumo não encontrado');
      const unidade = unidadeDoInsumo(insumo, item.unidadeId);
      if (item.siloId) {
        const silo = silos.find((s) => s.id === item.siloId);
        if (!silo || silo.insumoId !== insumo.id || (silo.abertura && silo.abertura > dto.data)) {
          throw new BadRequestException(`O silo escolhido não está aberto para ${insumo.nome}`);
        }
      }
      return {
        insumoId: item.insumoId,
        quantidade: item.quantidade,
        unidadeId: item.unidadeId,
        siloId: item.siloId,
        insumo,
        quantidadeBase: paraBase(item.quantidade, unidade.fator),
      };
    });

    // FR-013: estoque negativo só com confirmação
    const negativos = itens
      .map((i) => ({ insumoId: i.insumoId, nome: i.insumo.nome, depoisBase: (saldo.get(i.insumoId) ?? 0) - i.quantidadeBase }))
      .filter((i) => i.depoisBase < 0)
      .map((i) => ({ ...i, depoisBase: Math.round(i.depoisBase * 1000) / 1000 }));
    if (negativos.length > 0 && !dto.confirmarNegativo) {
      throw new ConflictException({
        codigo: 'ESTOQUE_NEGATIVO',
        insumos: negativos,
        message: `O estoque vai ficar negativo: ${negativos.map((n) => n.nome).join(', ')}`,
      });
    }

    return this.manager.transaction(async (manager) => {
      const fornecimento = await manager.save(
        manager.create(Fornecimento, {
          fazendaId,
          data: dto.data,
          loteId: lote.id,
          animais,
          dietaId: lote.dietaId,
          criadoPorId: usuarioId,
        }),
      );
      for (const item of itens) {
        const salvo = await manager.save(
          manager.create(ItemFornecimento, {
            fornecimentoId: fornecimento.id,
            insumoId: item.insumoId,
            quantidade: item.quantidade,
            unidadeId: item.unidadeId,
            quantidadeBase: item.quantidadeBase,
            siloId: item.siloId ?? null,
          }),
        );
        await manager.save(
          manager.create(MovimentoInsumo, {
            fazendaId,
            insumoId: item.insumoId,
            data: dto.data,
            tipo: TipoMovimento.BAIXA,
            motivo: MotivoMovimento.FORNECIMENTO,
            quantidade: item.quantidade,
            unidadeId: item.unidadeId,
            quantidadeBase: item.quantidadeBase,
            valorCentavos: null,
            aguardandoPreco: false,
            fornecedor: null,
            observacao: null,
            siloId: item.siloId ?? null,
            fornecimentoItemId: salvo.id,
            criadoPorId: usuarioId,
          }),
        );
      }
      return { id: fornecimento.id, animais, estoqueNegativo: negativos.map((n) => n.nome) };
    });
  }

  async listar(fazendaId: string, filtro: { de?: string; ate?: string; loteId?: string }, hoje = hojeLocal()) {
    const ate = filtro.ate ?? hoje;
    const de = filtro.de ?? ate;
    const fornecimentos = await this.manager.find(Fornecimento, {
      where: { fazendaId, data: Between(de, ate), ...(filtro.loteId ? { loteId: filtro.loteId } : {}) },
      relations: { lote: true, itens: { insumo: true, unidade: true } },
      order: { data: 'DESC', criadoEm: 'DESC' },
    });
    return fornecimentos.map((f) => ({
      id: f.id,
      data: f.data,
      lote: f.lote ? { id: f.lote.id, nome: f.lote.nome } : null,
      animais: f.animais,
      itens: (f.itens ?? []).map((i) => ({
        insumoId: i.insumoId,
        insumo: i.insumo?.nome ?? '',
        quantidade: i.quantidade,
        unidade: i.unidade?.nome ?? '',
        quantidadeBase: i.quantidadeBase,
        siloId: i.siloId,
      })),
      cancelamento: {
        cancelado: f.cancelamento.cancelado,
        motivoCancelamento: f.cancelamento.motivoCancelamento,
      },
    }));
  }

  // Devolve as quantidades ao estoque (e ao silo) cancelando os movimentos (FR-014)
  async cancelar(fazendaId: string, usuarioId: string, id: string, motivo: string) {
    return this.manager.transaction(async (manager) => {
      const fornecimento = await manager.findOne(Fornecimento, {
        where: { id },
        relations: { itens: true },
      });
      if (!fornecimento || fornecimento.fazendaId !== fazendaId) {
        throw new NotFoundException('Fornecimento não encontrado');
      }
      if (fornecimento.cancelamento.cancelado) {
        throw new BadRequestException('Este fornecimento já foi cancelado');
      }
      const cancelamento = {
        cancelado: true,
        canceladoEm: new Date(),
        canceladoPorId: usuarioId,
        motivoCancelamento: motivo,
      };
      const itemIds = (fornecimento.itens ?? []).map((i) => i.id);
      if (itemIds.length > 0) {
        const movimentos = await manager.find(MovimentoInsumo, {
          where: { fornecimentoItemId: In(itemIds) },
        });
        for (const m of movimentos) {
          m.cancelamento = cancelamento;
          m.atualizadoPorId = usuarioId;
        }
        await manager.save(movimentos);
      }
      await manager.update(
        Fornecimento,
        { id },
        {
          cancelamento,
          atualizadoPorId: usuarioId,
        },
      );
      return { cancelado: true };
    });
  }

  // Silos abertos (não encerrados), o aberto há mais tempo primeiro
  private async silosAbertos(fazendaId: string) {
    const silos = await this.manager.find(Silo, {
      where: { fazendaId, encerramento: IsNull() },
      order: { abertura: 'ASC' },
    });
    return silos.filter((s) => s.abertura !== null);
  }
}
