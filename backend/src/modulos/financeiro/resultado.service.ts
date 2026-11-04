import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hojeLocal } from '../../common/datas';
import { limitesDoMes } from './lancamentos.service';
import { Lancamento } from './entities/lancamento.entity';
import { ItemVenda } from './entities/venda-animais.entity';
import {
  mesesDoPeriodo,
  normalizarPeriodo,
  percentuaisPorCategoria,
  resultadoMensal,
  resumoVendas,
  type TotalPorMes,
} from './dominio/resultado';

// Resultado da fazenda (spec 003, US3): agrega no banco e calcula nas funções
// puras de dominio/resultado.ts. Cancelados nunca entram (FR-020).
@Injectable()
export class ResultadoService {
  constructor(
    @InjectRepository(Lancamento)
    private readonly lancamentoRepository: Repository<Lancamento>,
    @InjectRepository(ItemVenda)
    private readonly itemRepository: Repository<ItemVenda>,
  ) {}

  periodo(de?: string, ate?: string) {
    const p = normalizarPeriodo(hojeLocal().slice(0, 7), de, ate);
    return {
      ...p,
      meses: mesesDoPeriodo(p.de, p.ate),
      dataInicio: limitesDoMes(p.de)[0],
      dataFim: limitesDoMes(p.ate)[1],
    };
  }

  async mensal(fazendaId: string, de?: string, ate?: string) {
    const p = this.periodo(de, ate);
    const linhas = await this.lancamentoRepository
      .createQueryBuilder('l')
      .select("to_char(l.data, 'YYYY-MM')", 'mes')
      .addSelect('l.tipo', 'tipo')
      .addSelect('SUM(l.valor_centavos)::bigint', 'total')
      .where('l.fazenda_id = :fazendaId', { fazendaId })
      .andWhere('l.cancelado = false')
      .andWhere('l.data BETWEEN :inicio AND :fim', {
        inicio: p.dataInicio,
        fim: p.dataFim,
      })
      .groupBy('mes')
      .addGroupBy('l.tipo')
      .getRawMany<{ mes: string; tipo: TotalPorMes['tipo']; total: string }>();
    return {
      de: p.de,
      ate: p.ate,
      ...resultadoMensal(
        p.meses,
        linhas.map((l) => ({
          mes: l.mes,
          tipo: l.tipo,
          totalCentavos: Number(l.total),
        })),
      ),
    };
  }

  async despesasPorCategoria(fazendaId: string, de?: string, ate?: string) {
    const p = this.periodo(de, ate);
    const linhas = await this.lancamentoRepository
      .createQueryBuilder('l')
      .innerJoin('l.categoria', 'c')
      .select('c.nome', 'categoria')
      .addSelect('SUM(l.valor_centavos)::bigint', 'total')
      .where('l.fazenda_id = :fazendaId', { fazendaId })
      .andWhere('l.cancelado = false')
      .andWhere("l.tipo = 'DESPESA'")
      .andWhere('l.data BETWEEN :inicio AND :fim', {
        inicio: p.dataInicio,
        fim: p.dataFim,
      })
      .groupBy('c.nome')
      .getRawMany<{ categoria: string; total: string }>();
    return {
      de: p.de,
      ate: p.ate,
      categorias: percentuaisPorCategoria(
        linhas.map((l) => ({
          categoria: l.categoria,
          valorCentavos: Number(l.total),
        })),
      ),
    };
  }

  async vendas(fazendaId: string, de?: string, ate?: string) {
    const p = this.periodo(de, ate);
    const itens = await this.itemRepository
      .createQueryBuilder('i')
      .innerJoin('i.venda', 'v')
      .select("to_char(v.data, 'YYYY-MM')", 'mes')
      .addSelect('i.categoria_na_venda', 'categoria')
      .addSelect('i.arrobas', 'arrobas')
      .addSelect('i.valor_centavos', 'valor')
      .where('v.fazenda_id = :fazendaId', { fazendaId })
      .andWhere('v.cancelado = false')
      .andWhere('v.data BETWEEN :inicio AND :fim', {
        inicio: p.dataInicio,
        fim: p.dataFim,
      })
      .getRawMany<{
        mes: string;
        categoria: string;
        arrobas: string | null;
        valor: string;
      }>();
    return {
      de: p.de,
      ate: p.ate,
      ...resumoVendas(
        p.meses,
        itens.map((i) => ({
          mes: i.mes,
          categoria: i.categoria,
          arrobas: i.arrobas === null ? null : Number(i.arrobas),
          valorCentavos: Number(i.valor),
        })),
      ),
    };
  }
}
