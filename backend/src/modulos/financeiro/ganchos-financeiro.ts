import { Injectable, OnModuleInit } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { EventosModulos, ganchosModulos } from '../../common/ganchos-modulos';
import { AcessoModulosService } from '../acesso/acesso-modulos.service';
import { ModuloPago } from '../acesso/modulo-pago';
import {
  CategoriaFinanceira,
  CodigoCategoria,
  TipoLancamento,
} from './entities/categoria-financeira.entity';
import { Lancamento, OrigemLancamento } from './entities/lancamento.entity';
import { CategoriasService } from './categorias.service';
import { LancamentosService } from './lancamentos.service';

// Insumos de alimentação vão para "Ração e sal"; o resto, "Outras despesas"
const TIPOS_RACAO = new Set(['SILAGEM', 'RACAO', 'SAL_MINERAL', 'NUCLEO', 'FENO', 'CONCENTRADO']);

// O Financeiro ouve o Leite e a Nutrição (spec 006, research R1): lança a
// receita do recebimento do leite e a despesa das compras de insumo, e cancela
// quando a origem é desfeita. Só age com o Financeiro e o módulo de origem
// ATIVOS na fazenda (FR-001); roda na transação de quem emitiu (FR-004).
@Injectable()
export class GanchosFinanceiro implements OnModuleInit {
  constructor(
    private readonly acessoModulos: AcessoModulosService,
    private readonly categoriasService: CategoriasService,
    private readonly lancamentosService: LancamentosService,
  ) {}

  onModuleInit() {
    ganchosModulos.registrar('leiteRecebido', (m, d) => this.aoReceberLeite(m, d));
    ganchosModulos.registrar('leiteRecebimentoDesfeito', (m, d) =>
      this.cancelarDaOrigem(m, OrigemLancamento.LEITE, d.recebimentoId, d.fazendaId, d.motivo, d.usuarioId),
    );
    ganchosModulos.registrar('nutricaoCompraValorada', (m, d) => this.aoValorarCompra(m, d));
    ganchosModulos.registrar('nutricaoEntradaCancelada', (m, d) =>
      this.cancelarDaOrigem(m, OrigemLancamento.NUTRICAO, d.entradaId, d.fazendaId, d.motivo, d.usuarioId),
    );
  }

  private async ativos(fazendaId: string, origem: ModuloPago) {
    const [financeiro, outro] = await Promise.all([
      this.acessoModulos.situacao(fazendaId, ModuloPago.FINANCEIRO),
      this.acessoModulos.situacao(fazendaId, origem),
    ]);
    return financeiro === 'ATIVO' && outro === 'ATIVO';
  }

  async aoReceberLeite(manager: EntityManager, d: EventosModulos['leiteRecebido']) {
    if (!(await this.ativos(d.fazendaId, ModuloPago.LEITE))) return;
    const categoria = await this.categoriasService.porCodigo(manager, CodigoCategoria.VENDA_LEITE);
    const [ano, mes] = d.mes.split('-');
    const litros = d.litros.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
    await this.lancamentosService.lancarNaTransacao(manager, {
      fazendaId: d.fazendaId,
      usuarioId: d.usuarioId,
      tipo: TipoLancamento.RECEITA,
      data: d.data,
      valorCentavos: d.valorCentavos,
      categoriaId: categoria.id,
      descricao: `Leite de ${mes}/${ano} — ${litros} L`,
      origem: OrigemLancamento.LEITE,
      origemId: d.recebimentoId,
      origemCaminho: d.caminho,
    });
  }

  async aoValorarCompra(manager: EntityManager, d: EventosModulos['nutricaoCompraValorada']) {
    if (d.valorCentavos <= 0 || !(await this.ativos(d.fazendaId, ModuloPago.NUTRICAO))) return;
    const categoria = await this.categoriaDaCompra(manager, d.fazendaId, d.categoriaId, d.tipoInsumo);
    await this.lancamentosService.lancarNaTransacao(manager, {
      fazendaId: d.fazendaId,
      usuarioId: d.usuarioId,
      tipo: TipoLancamento.DESPESA,
      data: d.data,
      valorCentavos: d.valorCentavos,
      categoriaId: categoria.id,
      descricao: d.descricao,
      origem: OrigemLancamento.NUTRICAO,
      origemId: d.entradaId,
      origemCaminho: d.caminho,
    });
  }

  // A categoria escolhida no insumo, se for de despesa, ativa e da fazenda (ou
  // padrão); senão a padrão pelo tipo do insumo (FR-009)
  private async categoriaDaCompra(
    manager: EntityManager,
    fazendaId: string,
    categoriaId: string | null,
    tipoInsumo: string,
  ) {
    if (categoriaId) {
      const escolhida = await manager.findOne(CategoriaFinanceira, { where: { id: categoriaId } });
      if (
        escolhida &&
        escolhida.ativa &&
        escolhida.tipo === TipoLancamento.DESPESA &&
        (escolhida.fazendaId === null || escolhida.fazendaId === fazendaId)
      ) {
        return escolhida;
      }
    }
    return this.categoriasService.porCodigo(
      manager,
      TIPOS_RACAO.has(tipoInsumo) ? CodigoCategoria.RACAO_SAL : CodigoCategoria.OUTRAS_DESPESAS,
    );
  }

  // Desfazer na origem cancela o lançamento gerado, se houver (independe da
  // situação dos módulos: o lançamento existe e precisa acompanhar a origem)
  async cancelarDaOrigem(
    manager: EntityManager,
    origem: OrigemLancamento,
    origemId: string,
    fazendaId: string,
    motivo: string,
    usuarioId: string,
  ) {
    const financeiro = await this.acessoModulos.situacao(fazendaId, ModuloPago.FINANCEIRO);
    if (financeiro !== 'ATIVO') return;
    const lancamentos = await manager.find(Lancamento, {
      where: { fazendaId, origem, origemId, cancelamento: { cancelado: false } },
    });
    for (const l of lancamentos) {
      l.cancelamento = {
        cancelado: true,
        canceladoEm: new Date(),
        canceladoPorId: usuarioId,
        motivoCancelamento: motivo.slice(0, 200),
      };
      l.atualizadoPorId = usuarioId;
    }
    if (lancamentos.length > 0) await manager.save(lancamentos);
  }
}

