import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, EntityManager, Repository } from 'typeorm';
import { Animal } from '../../animal/entities/animal.entity';
import { Pasto } from '../../pasto/entities/pasto.entity';
import { TipoLancamento } from './entities/categoria-financeira.entity';
import { Lancamento, OrigemLancamento } from './entities/lancamento.entity';
import { CategoriasService } from './categorias.service';
import { CriarLancamentoDto, EditarLancamentoDto } from './dto/financeiro.dto';

// Primeiro e último dia do mês "AAAA-MM"
export function limitesDoMes(mes: string): [string, string] {
  const [ano, m] = mes.split('-').map(Number);
  const ultimo = new Date(Date.UTC(ano, m, 0)).getUTCDate();
  return [`${mes}-01`, `${mes}-${String(ultimo).padStart(2, '0')}`];
}

// Dados de um lançamento gerado por venda, compra ou uso, na transação de quem chama
export interface NovoLancamentoInterno {
  fazendaId: string;
  usuarioId: string;
  tipo: TipoLancamento;
  data: string;
  valorCentavos: number;
  categoriaId: string;
  descricao: string;
  origem: OrigemLancamento;
  animalId?: string | null;
  pastoId?: string | null;
  vendaId?: string | null;
  compraId?: string | null;
  registroUsoId?: string | null;
  origemId?: string | null;
  origemCaminho?: string | null;
}

// Receitas e despesas (spec 003, US1). Só o dono chega aqui (@Roles no controller).
@Injectable()
export class LancamentosService {
  constructor(
    @InjectRepository(Lancamento)
    private readonly lancamentoRepository: Repository<Lancamento>,
    @InjectRepository(Animal)
    private readonly animalRepository: Repository<Animal>,
    @InjectRepository(Pasto)
    private readonly pastoRepository: Repository<Pasto>,
    private readonly categoriasService: CategoriasService,
  ) {}

  // Lançamentos do mês com receita, despesa e saldo; cancelados na lista, fora
  // dos totais (FR-007, FR-008)
  async listarMes(
    fazendaId: string,
    filtro: { mes: string; tipo?: TipoLancamento; categoriaId?: string },
  ) {
    const [inicio, fim] = limitesDoMes(filtro.mes);
    const lancamentos = await this.lancamentoRepository.find({
      where: {
        fazendaId,
        data: Between(inicio, fim),
        ...(filtro.tipo && { tipo: filtro.tipo }),
        ...(filtro.categoriaId && { categoriaId: filtro.categoriaId }),
      },
      relations: { categoria: true, animal: true, pasto: true },
      order: { data: 'DESC', criadoEm: 'DESC' },
    });
    const validos = lancamentos.filter((l) => !l.cancelamento.cancelado);
    const soma = (tipo: TipoLancamento) =>
      validos
        .filter((l) => l.tipo === tipo)
        .reduce((total, l) => total + l.valorCentavos, 0);
    const receitaCentavos = soma(TipoLancamento.RECEITA);
    const despesaCentavos = soma(TipoLancamento.DESPESA);
    return {
      lancamentos: lancamentos.map((l) => ({
        id: l.id,
        tipo: l.tipo,
        data: l.data,
        valorCentavos: l.valorCentavos,
        categoria: l.categoria
          ? { id: l.categoria.id, nome: l.categoria.nome }
          : null,
        descricao: l.descricao,
        animal: l.animal ? { id: l.animal.id, brinco: l.animal.brinco } : null,
        pasto: l.pasto ? { id: l.pasto.id, nome: l.pasto.nome } : null,
        origem: l.origem,
        vendaId: l.vendaId,
        cancelamento: l.cancelamento,
      })),
      receitaCentavos,
      despesaCentavos,
      saldoCentavos: receitaCentavos - despesaCentavos,
    };
  }

  async criar(fazendaId: string, usuarioId: string, dto: CriarLancamentoDto) {
    await this.categoriasService.validarParaLancar(
      fazendaId,
      dto.categoriaId,
      dto.tipo,
    );
    await this.validarAnimalOuPasto(fazendaId, dto.animalId, dto.pastoId);
    return this.lancamentoRepository.save(
      this.lancamentoRepository.create({
        fazendaId,
        tipo: dto.tipo,
        data: dto.data,
        valorCentavos: dto.valorCentavos,
        categoriaId: dto.categoriaId,
        descricao: dto.descricao,
        animalId: dto.animalId ?? null,
        pastoId: dto.pastoId ?? null,
        origem: OrigemLancamento.MANUAL,
        vendaId: null,
        compraId: null,
        registroUsoId: null,
        criadoPorId: usuarioId,
      }),
    );
  }

  async editar(
    fazendaId: string,
    usuarioId: string,
    id: string,
    dto: EditarLancamentoDto,
  ) {
    const lancamento = await this.buscarEditavel(fazendaId, id);
    if (dto.categoriaId && dto.categoriaId !== lancamento.categoriaId) {
      await this.categoriasService.validarParaLancar(
        fazendaId,
        dto.categoriaId,
        lancamento.tipo,
      );
    }
    await this.lancamentoRepository.update(
      { id },
      {
        ...(dto.data && { data: dto.data }),
        ...(dto.valorCentavos && { valorCentavos: dto.valorCentavos }),
        ...(dto.categoriaId && { categoriaId: dto.categoriaId }),
        ...(dto.descricao && { descricao: dto.descricao }),
        atualizadoPorId: usuarioId,
      },
    );
    return this.lancamentoRepository.findOneBy({ id });
  }

  async cancelar(
    fazendaId: string,
    usuarioId: string,
    id: string,
    motivo: string,
  ) {
    await this.buscarEditavel(fazendaId, id);
    await this.lancamentoRepository.update(
      { id },
      {
        cancelamento: {
          cancelado: true,
          canceladoEm: new Date(),
          canceladoPorId: usuarioId,
          motivoCancelamento: motivo.trim(),
        },
        atualizadoPorId: usuarioId,
      },
    );
    return { cancelado: true };
  }

  // Lançamento gerado por venda, compra ou uso, na mesma transação
  async lancarNaTransacao(
    manager: EntityManager,
    dados: NovoLancamentoInterno,
  ) {
    return manager.save(
      manager.create(Lancamento, {
        fazendaId: dados.fazendaId,
        tipo: dados.tipo,
        data: dados.data,
        valorCentavos: dados.valorCentavos,
        categoriaId: dados.categoriaId,
        descricao: dados.descricao.slice(0, 200),
        animalId: dados.animalId ?? null,
        pastoId: dados.pastoId ?? null,
        origem: dados.origem,
        vendaId: dados.vendaId ?? null,
        compraId: dados.compraId ?? null,
        registroUsoId: dados.registroUsoId ?? null,
        origemId: dados.origemId ?? null,
        origemCaminho: dados.origemCaminho ?? null,
        criadoPorId: dados.usuarioId,
      }),
    );
  }

  async validarAnimalOuPasto(
    fazendaId: string,
    animalId?: string | null,
    pastoId?: string | null,
  ) {
    if (animalId && pastoId) {
      throw new BadRequestException(
        'Ligue o lançamento a um animal ou a um pasto, não aos dois',
      );
    }
    if (animalId) {
      const animal = await this.animalRepository.findOneBy({ id: animalId });
      if (!animal || animal.fazendaId !== fazendaId) {
        throw new NotFoundException('Animal não encontrado');
      }
    }
    if (pastoId) {
      const pasto = await this.pastoRepository.findOneBy({ id: pastoId });
      if (!pasto || pasto.fazendaId !== fazendaId) {
        throw new NotFoundException('Pasto não encontrado');
      }
    }
  }

  // Só lançamentos digitados ou de uso mudam por aqui; venda e compra mudam
  // pela própria venda ou compra
  private async buscarEditavel(fazendaId: string, id: string) {
    const lancamento = await this.lancamentoRepository.findOneBy({ id });
    if (!lancamento || lancamento.fazendaId !== fazendaId) {
      throw new NotFoundException('Lançamento não encontrado');
    }
    if (lancamento.cancelamento.cancelado) {
      throw new BadRequestException('Este lançamento já foi cancelado');
    }
    const mensagens: Partial<Record<OrigemLancamento, string>> = {
      [OrigemLancamento.VENDA]: 'Este lançamento veio de uma venda: corrija ou cancele a venda',
      [OrigemLancamento.COMPRA]: 'Este lançamento veio de uma compra de animal',
      [OrigemLancamento.LEITE]: 'Este lançamento veio do Leite: corrija o recebimento do leite',
      [OrigemLancamento.NUTRICAO]: 'Este lançamento veio da Nutrição: corrija a entrada do insumo',
    };
    const mensagem = mensagens[lancamento.origem];
    if (mensagem) throw new BadRequestException(mensagem);
    return lancamento;
  }
}
