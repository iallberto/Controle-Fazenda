import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Between, EntityManager, In, LessThanOrEqual, Not, IsNull } from 'typeorm';
import { hojeLocal } from '../../common/datas';
import { Insumo } from './entities/insumo.entity';
import { Fornecimento } from './entities/fornecimento.entity';
import { MotivoMovimento, MovimentoInsumo, TipoMovimento } from './entities/movimento-insumo.entity';
import { custoMedio, custoPorAnimalDia, situacaoEstoque } from './dominio/regras';
import { estoques } from './estoque-base';

// Preço das entradas, pendências e custo da alimentação (spec 005, US4,
// FR-020 a FR-022; research R3, R8, R9). Tudo só do dono.
@Injectable()
export class CustoService {
  constructor(@InjectEntityManager() private readonly manager: EntityManager) {}

  async aguardandoPreco(fazendaId: string) {
    const entradas = await this.manager.find(MovimentoInsumo, {
      where: { fazendaId, aguardandoPreco: true, cancelamento: { cancelado: false } },
      relations: { insumo: true, unidade: true },
      order: { data: 'ASC' },
    });
    return entradas.map((e) => ({
      id: e.id,
      data: e.data,
      insumo: e.insumo?.nome ?? '',
      quantidade: e.quantidade,
      unidade: e.unidade?.nome ?? '',
      fornecedor: e.fornecedor,
      criadoPorId: e.criadoPorId,
    }));
  }

  async informarPreco(fazendaId: string, usuarioId: string, id: string, valorCentavos: number) {
    const entrada = await this.manager.findOne(MovimentoInsumo, { where: { id } });
    if (!entrada || entrada.fazendaId !== fazendaId) throw new NotFoundException('Entrada não encontrada');
    if (entrada.tipo !== TipoMovimento.ENTRADA || entrada.motivo === MotivoMovimento.SILO) {
      throw new BadRequestException('O preço é de uma entrada de compra ou de produção');
    }
    if (entrada.cancelamento.cancelado) throw new BadRequestException('Esta entrada foi cancelada');
    entrada.valorCentavos = valorCentavos;
    entrada.aguardandoPreco = false;
    entrada.atualizadoPorId = usuarioId;
    await this.manager.save(entrada);
    return { id, valorCentavos };
  }

  async pendencias(fazendaId: string) {
    const [aguardando, insumos, saldo] = await Promise.all([
      this.manager.count(MovimentoInsumo, {
        where: { fazendaId, aguardandoPreco: true, cancelamento: { cancelado: false } },
      }),
      this.manager.find(Insumo, { where: { fazendaId, ativo: true } }),
      estoques(this.manager, fazendaId),
    ]);
    return {
      entradasAguardandoPreco: aguardando,
      insumosAbaixoDoMinimo: insumos.filter(
        (i) => situacaoEstoque(saldo.get(i.id) ?? 0, i.estoqueMinimoBase) !== 'NORMAL',
      ).length,
    };
  }

  // Custo por lote no período (padrão: mês atual), por animal-dia e por insumo
  async custo(fazendaId: string, filtro: { de?: string; ate?: string; loteId?: string }, hoje = hojeLocal()) {
    const ate = filtro.ate ?? hoje;
    const de = filtro.de ?? `${ate.slice(0, 7)}-01`;
    if (de > ate) throw new BadRequestException('O início do período é depois do fim');
    const fornecimentos = await this.manager.find(Fornecimento, {
      where: {
        fazendaId,
        data: Between(de, ate),
        cancelamento: { cancelado: false },
        ...(filtro.loteId ? { loteId: filtro.loteId } : {}),
      },
      relations: { lote: true, itens: { insumo: true } },
    });
    const insumoIds = [...new Set(fornecimentos.flatMap((f) => (f.itens ?? []).map((i) => i.insumoId)))];
    const entradas = insumoIds.length
      ? await this.manager.find(MovimentoInsumo, {
          where: {
            insumoId: In(insumoIds),
            tipo: TipoMovimento.ENTRADA,
            valorCentavos: Not(IsNull()),
            data: LessThanOrEqual(ate),
            cancelamento: { cancelado: false },
          },
        })
      : [];
    const porInsumo = new Map<string, typeof entradas>();
    for (const e of entradas) porInsumo.set(e.insumoId, [...(porInsumo.get(e.insumoId) ?? []), e]);

    const semPreco = new Set<string>();
    const lotes = new Map<
      string,
      {
        loteId: string;
        nome: string;
        fornecimentos: { data: string; animais: number; custoCentavos: number }[];
        insumos: Map<string, { nome: string; unidadeBase: string; base: number; totalCentavos: number }>;
      }
    >();
    for (const f of fornecimentos) {
      const lote = lotes.get(f.loteId) ?? {
        loteId: f.loteId,
        nome: f.lote?.nome ?? '',
        fornecimentos: [] as { data: string; animais: number; custoCentavos: number }[],
        insumos: new Map<string, { nome: string; unidadeBase: string; base: number; totalCentavos: number }>(),
      };
      let custoDoTrato = 0;
      for (const item of f.itens ?? []) {
        const medio = custoMedio(porInsumo.get(item.insumoId) ?? [], f.data);
        if (medio === null) semPreco.add(item.insumo?.nome ?? item.insumoId);
        const valor = (medio ?? 0) * item.quantidadeBase;
        custoDoTrato += valor;
        const acumulado = lote.insumos.get(item.insumoId) ?? {
          nome: item.insumo?.nome ?? '',
          unidadeBase: item.insumo?.unidadeBase ?? 'KG',
          base: 0,
          totalCentavos: 0,
        };
        acumulado.base += item.quantidadeBase;
        acumulado.totalCentavos += valor;
        lote.insumos.set(item.insumoId, acumulado);
      }
      lote.fornecimentos.push({ data: f.data, animais: f.animais, custoCentavos: custoDoTrato });
      lotes.set(f.loteId, lote);
    }

    return {
      de,
      ate,
      lotes: [...lotes.values()]
        .map((l) => {
          const resumo = custoPorAnimalDia(l.fornecimentos);
          return {
            loteId: l.loteId,
            nome: l.nome,
            ...resumo,
            insumos: [...l.insumos.values()]
              .map((i) => ({
                nome: i.nome,
                unidadeBase: i.unidadeBase,
                base: Math.round(i.base * 1000) / 1000,
                totalCentavos: Math.round(i.totalCentavos),
                percentual:
                  resumo.totalCentavos > 0 ? Math.round((i.totalCentavos / resumo.totalCentavos) * 1000) / 10 : 0,
              }))
              .sort((a, b) => b.totalCentavos - a.totalCentavos),
          };
        })
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
      insumosSemPreco: [...semPreco].sort(),
    };
  }

  // Custo de cada fornecimento (para a lista do dono)
  async custoDosFornecimentos(fornecimentos: Fornecimento[]) {
    const insumoIds = [...new Set(fornecimentos.flatMap((f) => (f.itens ?? []).map((i) => i.insumoId)))];
    if (insumoIds.length === 0) return new Map<string, number>();
    const entradas = await this.manager.find(MovimentoInsumo, {
      where: {
        insumoId: In(insumoIds),
        tipo: TipoMovimento.ENTRADA,
        valorCentavos: Not(IsNull()),
        cancelamento: { cancelado: false },
      },
    });
    return new Map(
      fornecimentos.map((f) => [
        f.id,
        Math.round(
          (f.itens ?? []).reduce(
            (s, i) => s + (custoMedio(entradas.filter((e) => e.insumoId === i.insumoId), f.data) ?? 0) * i.quantidadeBase,
            0,
          ),
        ),
      ]),
    );
  }
}
