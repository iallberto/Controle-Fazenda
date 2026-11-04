import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { hojeLocal } from '../../common/datas';
import { MotivoMovimento, MovimentoInsumo, TipoMovimento } from './entities/movimento-insumo.entity';
import { paraBase } from './dominio/regras';
import { buscarInsumo, ehDono, unidadeDoInsumo } from './estoque-base';
import { BaixaDto, EntradaDto } from './dto/nutricao.dto';

// Entradas e baixas avulsas (spec 005, US1, FR-005, FR-006, FR-008; R2, R3)
@Injectable()
export class MovimentosService {
  constructor(@InjectEntityManager() private readonly manager: EntityManager) {}

  async entrada(fazendaId: string, usuarioId: string, papel: string, dto: EntradaDto, hoje = hojeLocal()) {
    if (dto.valorCentavos !== undefined && !ehDono(papel)) {
      throw new ForbiddenException('O preço é informado pelo dono');
    }
    const movimento = await this.novo(fazendaId, usuarioId, dto, TipoMovimento.ENTRADA, hoje);
    movimento.fornecedor = dto.fornecedor ?? null;
    movimento.valorCentavos = dto.valorCentavos ?? null;
    // Compra sem valor fica para o dono informar (FR-021)
    movimento.aguardandoPreco =
      dto.motivo === MotivoMovimento.COMPRA && dto.valorCentavos === undefined;
    const salvo = await this.manager.save(movimento);
    return { id: salvo.id, quantidadeBase: salvo.quantidadeBase, aguardandoPreco: salvo.aguardandoPreco };
  }

  async baixa(fazendaId: string, usuarioId: string, dto: BaixaDto, hoje = hojeLocal()) {
    if (dto.motivo === MotivoMovimento.OUTRO && !dto.observacao) {
      throw new BadRequestException('Explique o motivo da baixa na observação');
    }
    const movimento = await this.novo(fazendaId, usuarioId, dto, TipoMovimento.BAIXA, hoje);
    const salvo = await this.manager.save(movimento);
    return { id: salvo.id, quantidadeBase: salvo.quantidadeBase };
  }

  // Só entradas e baixas avulsas; fornecimento e silo mudam pela origem
  async cancelar(fazendaId: string, usuarioId: string, id: string, motivo: string) {
    const movimento = await this.manager.findOne(MovimentoInsumo, { where: { id } });
    if (!movimento || movimento.fazendaId !== fazendaId) {
      throw new NotFoundException('Lançamento não encontrado');
    }
    if (movimento.motivo === MotivoMovimento.FORNECIMENTO || movimento.motivo === MotivoMovimento.SILO) {
      throw new BadRequestException(
        'Este lançamento vem de um fornecimento ou de um silo: cancele por lá',
      );
    }
    if (movimento.cancelamento.cancelado) {
      throw new BadRequestException('Este lançamento já foi cancelado');
    }
    movimento.cancelamento = {
      cancelado: true,
      canceladoEm: new Date(),
      canceladoPorId: usuarioId,
      motivoCancelamento: motivo,
    };
    movimento.atualizadoPorId = usuarioId;
    await this.manager.save(movimento);
    return { cancelado: true };
  }

  private async novo(
    fazendaId: string,
    usuarioId: string,
    dto: EntradaDto | BaixaDto,
    tipo: TipoMovimento,
    hoje: string,
  ) {
    if (dto.data > hoje) throw new BadRequestException('A data não pode ser no futuro');
    const insumo = await buscarInsumo(this.manager, fazendaId, dto.insumoId);
    if (!insumo.ativo) throw new BadRequestException(`O insumo ${insumo.nome} está desativado`);
    const unidade = unidadeDoInsumo(insumo, dto.unidadeId);
    return this.manager.create(MovimentoInsumo, {
      fazendaId,
      insumoId: insumo.id,
      data: dto.data,
      tipo,
      motivo: dto.motivo,
      quantidade: dto.quantidade,
      unidadeId: unidade.id,
      quantidadeBase: paraBase(dto.quantidade, unidade.fator),
      valorCentavos: null,
      aguardandoPreco: false,
      fornecedor: null,
      observacao: dto.observacao ?? null,
      siloId: null,
      fornecimentoItemId: null,
      criadoPorId: usuarioId,
    });
  }
}
