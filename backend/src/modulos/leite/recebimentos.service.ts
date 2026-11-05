import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Between, EntityManager } from 'typeorm';
import { hojeLocal } from '../../common/datas';
import { ganchosModulos } from '../../common/ganchos-modulos';
import { EntregaLeite } from './entities/entrega-leite.entity';
import { RecebimentoLeite } from './entities/recebimento-leite.entity';
import { limitesDoMes, valorDaEntrega } from './entregas.service';

const arredondar = (valor: number) => Math.round(valor * 10) / 10;

// Recebimento do leite do mês (spec 006, US1, FR-006 a FR-007a; research R3).
// Só o dono. Com o Financeiro ativo, vira receita pelo gancho `leiteRecebido`.
@Injectable()
export class RecebimentosService {
  constructor(@InjectEntityManager() private readonly manager: EntityManager) {}

  // Recebimento em vigor do mês (ou null) e o previsto pelas entregas
  async doMes(fazendaId: string, mes: string) {
    const [recebimento, previsto] = await Promise.all([
      this.emVigor(this.manager, fazendaId, mes),
      this.previsto(this.manager, fazendaId, mes),
    ]);
    return {
      mes,
      recebimento: recebimento
        ? {
            id: recebimento.id,
            data: recebimento.data,
            litros: recebimento.litros,
            totalCalculadoCentavos: recebimento.totalCalculadoCentavos,
            valorRecebidoCentavos: recebimento.valorRecebidoCentavos,
            diferencaCentavos: recebimento.valorRecebidoCentavos - recebimento.totalCalculadoCentavos,
            observacao: recebimento.observacao,
          }
        : null,
      previsto,
    };
  }

  async confirmar(
    fazendaId: string,
    usuarioId: string,
    dto: { mes: string; data: string; valorRecebidoCentavos?: number; observacao?: string },
    hoje = hojeLocal(),
  ) {
    if (dto.data > hoje) throw new BadRequestException('O recebimento não pode ser no futuro');
    if (dto.data < `${dto.mes}-01`) {
      throw new BadRequestException('O recebimento não pode ser antes do mês das entregas');
    }
    return this.manager.transaction(async (manager) => {
      if (await this.emVigor(manager, fazendaId, dto.mes)) {
        throw new ConflictException('O leite deste mês já foi recebido');
      }
      const previsto = await this.previsto(manager, fazendaId, dto.mes);
      if (previsto.entregas === 0) throw new BadRequestException('Não há entregas neste mês');
      // FR-006b: todas as entregas do mês com preço
      if (previsto.entregasSemPreco.length > 0) {
        throw new BadRequestException({
          codigo: 'ENTREGAS_SEM_PRECO',
          entregas: previsto.entregasSemPreco,
          message: `Informe o preço de ${previsto.entregasSemPreco.length} entrega(s) do mês antes de confirmar o recebimento`,
        });
      }
      const valor = dto.valorRecebidoCentavos ?? previsto.totalCalculadoCentavos;
      if (valor <= 0) throw new BadRequestException('Informe o valor recebido');
      const recebimento = await manager.save(
        manager.create(RecebimentoLeite, {
          fazendaId,
          mes: dto.mes,
          data: dto.data,
          litros: previsto.litros,
          totalCalculadoCentavos: previsto.totalCalculadoCentavos,
          valorRecebidoCentavos: valor,
          observacao: dto.observacao ?? null,
          criadoPorId: usuarioId,
        }),
      );
      await ganchosModulos.emitir('leiteRecebido', manager, {
        fazendaId,
        recebimentoId: recebimento.id,
        mes: dto.mes,
        data: dto.data,
        litros: previsto.litros,
        valorCentavos: valor,
        caminho: `/modulos/leite/entregas?mes=${dto.mes}`,
        usuarioId,
      });
      return {
        id: recebimento.id,
        valorRecebidoCentavos: valor,
        diferencaCentavos: valor - previsto.totalCalculadoCentavos,
      };
    });
  }

  // Desfazer libera as entregas e cancela a receita gerada (FR-007a)
  async desfazer(fazendaId: string, usuarioId: string, id: string, motivo: string) {
    return this.manager.transaction(async (manager) => {
      const recebimento = await manager.findOne(RecebimentoLeite, { where: { id } });
      if (!recebimento || recebimento.fazendaId !== fazendaId) {
        throw new NotFoundException('Recebimento não encontrado');
      }
      if (recebimento.cancelamento.cancelado) {
        throw new BadRequestException('Este recebimento já foi desfeito');
      }
      recebimento.cancelamento = {
        cancelado: true,
        canceladoEm: new Date(),
        canceladoPorId: usuarioId,
        motivoCancelamento: motivo,
      };
      recebimento.atualizadoPorId = usuarioId;
      await manager.save(recebimento);
      await ganchosModulos.emitir('leiteRecebimentoDesfeito', manager, {
        fazendaId,
        recebimentoId: id,
        motivo,
        usuarioId,
      });
      return { desfeito: true };
    });
  }

  private emVigor(manager: EntityManager, fazendaId: string, mes: string) {
    return manager.findOne(RecebimentoLeite, {
      where: { fazendaId, mes, cancelamento: { cancelado: false } },
    });
  }

  private async previsto(manager: EntityManager, fazendaId: string, mes: string) {
    const { de, ate } = limitesDoMes(mes);
    const entregas = (
      await manager.find(EntregaLeite, {
        where: { fazendaId, data: Between(de, ate) },
        order: { data: 'ASC' },
      })
    ).filter((e) => !e.cancelamento.cancelado);
    return {
      entregas: entregas.length,
      litros: arredondar(entregas.reduce((s, e) => s + e.litros, 0)),
      totalCalculadoCentavos: entregas.reduce(
        (s, e) => s + (valorDaEntrega(e.litros, e.precoLitroCentavos) ?? 0),
        0,
      ),
      entregasSemPreco: entregas
        .filter((e) => e.precoLitroCentavos === null)
        .map((e) => ({ id: e.id, data: e.data, litros: e.litros })),
    };
  }
}
