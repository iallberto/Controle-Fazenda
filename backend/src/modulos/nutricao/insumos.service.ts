import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, IsNull } from 'typeorm';
import { hojeLocal } from '../../common/datas';
import { Insumo, TipoInsumo, UnidadeBase, UnidadeInsumo } from './entities/insumo.entity';
import { MotivoMovimento, MovimentoInsumo, TipoMovimento } from './entities/movimento-insumo.entity';
import { Silo } from './entities/silo.entity';
import {
  custoMedio,
  daBase,
  normalizarNome,
  situacaoEstoque,
  unidadesPadrao,
} from './dominio/regras';
import { buscarInsumo, ehDono, estoques } from './estoque-base';
import {
  CriarInsumoDto,
  CriarUnidadeDto,
  EditarInsumoDto,
} from './dto/nutricao.dto';

// Insumos, unidades e estoque (spec 005, US1, FR-004 a FR-009)
@Injectable()
export class InsumosService {
  constructor(@InjectEntityManager() private readonly manager: EntityManager) {}

  async listar(fazendaId: string, papel: string, incluirInativos = false, hoje = hojeLocal()) {
    const [insumos, saldo, silos, entradas] = await Promise.all([
      this.manager.find(Insumo, {
        where: incluirInativos ? { fazendaId } : { fazendaId, ativo: true },
        relations: { unidades: true },
      }),
      estoques(this.manager, fazendaId),
      this.manager.find(Silo, { where: { fazendaId, abertura: IsNull(), encerramento: IsNull() } }),
      ehDono(papel)
        ? this.manager.find(MovimentoInsumo, {
            where: { fazendaId, tipo: TipoMovimento.ENTRADA, cancelamento: { cancelado: false } },
          })
        : Promise.resolve([] as MovimentoInsumo[]),
    ]);
    return insumos
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      .map((insumo) => {
        const estoqueBase = saldo.get(insumo.id) ?? 0;
        const compra = insumo.unidades?.find((u) => u.id === insumo.unidadeCompraId) ?? null;
        const reservaKg = silos
          .filter((s) => s.insumoId === insumo.id)
          .reduce((s, silo) => s + silo.toneladasEnsiladas * 1000, 0);
        const base = {
          id: insumo.id,
          nome: insumo.nome,
          tipo: insumo.tipo,
          unidadeBase: insumo.unidadeBase,
          unidades: (insumo.unidades ?? [])
            .map((u) => ({ id: u.id, nome: u.nome, fator: u.fator, ativa: u.ativa }))
            .sort((a, b) => a.fator - b.fator),
          unidadeCompraId: insumo.unidadeCompraId,
          estoqueMinimoBase: insumo.estoqueMinimoBase,
          ativo: insumo.ativo,
          estoqueBase,
          estoqueNaCompra: compra ? { unidade: compra.nome, quantidade: daBase(estoqueBase, compra.fator) } : null,
          situacao: situacaoEstoque(estoqueBase, insumo.estoqueMinimoBase),
          reservaSilosFechadosBase: reservaKg,
        };
        if (!ehDono(papel)) return base;
        const media = custoMedio(
          entradas.filter((e) => e.insumoId === insumo.id),
          hoje,
        );
        return {
          ...base,
          categoriaDespesaId: insumo.categoriaDespesaId,
          custoMedioCentavosPorBase: media === null ? null : Math.round(media * 10000) / 10000 };
      });
  }

  async criar(fazendaId: string, usuarioId: string, dto: CriarInsumoDto) {
    if (dto.tipo === TipoInsumo.SILAGEM && dto.unidadeBase !== UnidadeBase.KG) {
      throw new BadRequestException('Silagem é controlada em kg');
    }
    await this.garantirNomeLivre(fazendaId, dto.nome);
    return this.manager.transaction(async (manager) => {
      const insumo = await manager.save(
        manager.create(Insumo, {
          fazendaId,
          nome: dto.nome,
          tipo: dto.tipo,
          unidadeBase: dto.unidadeBase,
          estoqueMinimoBase: dto.estoqueMinimo ?? null,
          unidadeCompraId: null,
          ativo: true,
          criadoPorId: usuarioId,
        }),
      );
      const unidades = await manager.save(
        unidadesPadrao(dto.unidadeBase).map((u) =>
          manager.create(UnidadeInsumo, { ...u, insumoId: insumo.id, ativa: true, criadoPorId: usuarioId }),
        ),
      );
      return {
        id: insumo.id,
        nome: insumo.nome,
        tipo: insumo.tipo,
        unidadeBase: insumo.unidadeBase,
        estoqueMinimoBase: insumo.estoqueMinimoBase,
        unidades,
      };
    });
  }

  async editar(fazendaId: string, usuarioId: string, id: string, dto: EditarInsumoDto) {
    const insumo = await buscarInsumo(this.manager, fazendaId, id);
    if (dto.nome !== undefined && normalizarNome(dto.nome) !== normalizarNome(insumo.nome)) {
      await this.garantirNomeLivre(fazendaId, dto.nome, id);
      insumo.nome = dto.nome;
    }
    if (dto.unidadeCompraId !== undefined) {
      if (dto.unidadeCompraId && !insumo.unidades?.some((u) => u.id === dto.unidadeCompraId)) {
        throw new BadRequestException('A unidade não pertence a este insumo');
      }
      insumo.unidadeCompraId = dto.unidadeCompraId;
    }
    if (dto.estoqueMinimo !== undefined) insumo.estoqueMinimoBase = dto.estoqueMinimo;
    if (dto.categoriaDespesaId !== undefined) insumo.categoriaDespesaId = dto.categoriaDespesaId;
    if (dto.ativo !== undefined) insumo.ativo = dto.ativo;
    insumo.atualizadoPorId = usuarioId;
    const { unidades: _u, ...semUnidades } = insumo;
    void _u;
    await this.manager.save(Insumo, semUnidades);
    return buscarInsumo(this.manager, fazendaId, id);
  }

  async criarUnidade(fazendaId: string, usuarioId: string, insumoId: string, dto: CriarUnidadeDto) {
    const insumo = await buscarInsumo(this.manager, fazendaId, insumoId);
    if (insumo.unidades?.some((u) => normalizarNome(u.nome) === normalizarNome(dto.nome))) {
      throw new ConflictException('Este insumo já tem uma unidade com esse nome');
    }
    return this.manager.save(
      this.manager.create(UnidadeInsumo, {
        insumoId,
        nome: dto.nome,
        fator: dto.fator,
        ativa: true,
        criadoPorId: usuarioId,
      }),
    );
  }

  // O fator não muda (FR-004b); só ativa ou desativa
  async editarUnidade(
    fazendaId: string,
    usuarioId: string,
    insumoId: string,
    unidadeId: string,
    ativa: boolean,
  ) {
    const insumo = await buscarInsumo(this.manager, fazendaId, insumoId);
    const unidade = insumo.unidades?.find((u) => u.id === unidadeId);
    if (!unidade) throw new NotFoundException('Unidade não encontrada');
    if (!ativa && unidade.fator === 1 && insumo.unidades!.filter((u) => u.ativa).length === 1) {
      throw new BadRequestException('O insumo precisa de pelo menos uma unidade ativa');
    }
    unidade.ativa = ativa;
    unidade.atualizadoPorId = usuarioId;
    const { insumo: _i, ...semInsumo } = unidade;
    void _i;
    return this.manager.save(UnidadeInsumo, semInsumo);
  }

  // Histórico do insumo, mais novo primeiro (FR-009)
  async movimentos(fazendaId: string, papel: string, insumoId: string) {
    await buscarInsumo(this.manager, fazendaId, insumoId);
    const movimentos = await this.manager.find(MovimentoInsumo, {
      where: { fazendaId, insumoId },
      relations: { unidade: true },
      order: { data: 'DESC', criadoEm: 'DESC' },
      take: 300,
    });
    return movimentos.map((m) => ({
      id: m.id,
      data: m.data,
      tipo: m.tipo,
      motivo: m.motivo,
      quantidade: m.quantidade,
      unidade: m.unidade?.nome ?? null,
      quantidadeBase: m.quantidadeBase,
      fornecedor: m.fornecedor,
      observacao: m.observacao,
      aguardandoPreco: m.aguardandoPreco,
      avulso: m.motivo !== MotivoMovimento.FORNECIMENTO && m.motivo !== MotivoMovimento.SILO,
      cancelamento: {
        cancelado: m.cancelamento.cancelado,
        motivoCancelamento: m.cancelamento.motivoCancelamento,
      },
      ...(ehDono(papel) ? { valorCentavos: m.valorCentavos } : {}),
    }));
  }

  private async garantirNomeLivre(fazendaId: string, nome: string, exceto?: string) {
    const insumos = await this.manager.find(Insumo, { where: { fazendaId } });
    if (insumos.some((i) => i.id !== exceto && normalizarNome(i.nome) === normalizarNome(nome))) {
      throw new ConflictException('Já existe um insumo com este nome');
    }
  }
}
