import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Between, EntityManager } from 'typeorm';
import { hojeLocal } from '../../common/datas';
import { AnaliseLeite } from './entities/analise-leite.entity';
import { EntregaLeite } from './entities/entrega-leite.entity';
import { CriarAnaliseDto } from './dto/leite.dto';

const VALORES = ['ccsMil', 'cbtMil', 'gordura', 'proteina'] as const;

// Análises do laticínio por mês ou por entrega (spec 004, FR-024, FR-025)
@Injectable()
export class AnalisesService {
  constructor(
    @InjectEntityManager() private readonly manager: EntityManager,
  ) {}

  // Histórico mês a mês (padrão: últimos 12 meses), mais novo primeiro
  async listar(fazendaId: string, de?: string, ate?: string) {
    const fim = ate ?? hojeLocal().slice(0, 7);
    const inicio = de ?? somarMeses(fim, -11);
    const analises = await this.manager.find(AnaliseLeite, {
      where: { fazendaId, mes: Between(inicio, fim) },
      relations: { entrega: true },
      order: { mes: 'DESC', criadoEm: 'DESC' },
    });
    return analises.map((a) => ({
      id: a.id,
      mes: a.mes,
      entrega: a.entrega ? { id: a.entrega.id, data: a.entrega.data } : null,
      ccsMil: a.ccsMil,
      cbtMil: a.cbtMil,
      gordura: a.gordura,
      proteina: a.proteina,
      cancelamento: {
        cancelado: a.cancelamento.cancelado,
        motivoCancelamento: a.cancelamento.motivoCancelamento,
      },
    }));
  }

  async criar(fazendaId: string, usuarioId: string, dto: CriarAnaliseDto) {
    await this.validar(fazendaId, dto);
    const salva = await this.manager.save(
      this.manager.create(AnaliseLeite, {
        fazendaId,
        mes: dto.mes,
        entregaId: dto.entregaId ?? null,
        ccsMil: dto.ccsMil ?? null,
        cbtMil: dto.cbtMil ?? null,
        gordura: dto.gordura ?? null,
        proteina: dto.proteina ?? null,
        criadoPorId: usuarioId,
      }),
    );
    return { id: salva.id, mes: salva.mes };
  }

  async editar(
    fazendaId: string,
    usuarioId: string,
    id: string,
    dto: Partial<CriarAnaliseDto>,
  ) {
    const analise = await this.buscar(fazendaId, id);
    const novo = { ...dadosDe(analise), ...dto } as CriarAnaliseDto;
    await this.validar(fazendaId, novo);
    Object.assign(analise, dto, { atualizadoPorId: usuarioId });
    await this.manager.save(analise);
    return { id, mes: analise.mes };
  }

  async cancelar(fazendaId: string, usuarioId: string, id: string, motivo: string) {
    const analise = await this.buscar(fazendaId, id);
    analise.cancelamento = {
      cancelado: true,
      canceladoEm: new Date(),
      canceladoPorId: usuarioId,
      motivoCancelamento: motivo,
    };
    analise.atualizadoPorId = usuarioId;
    await this.manager.save(analise);
    return { cancelada: true };
  }

  private async validar(fazendaId: string, dto: CriarAnaliseDto) {
    if (VALORES.every((campo) => dto[campo] === undefined || dto[campo] === null)) {
      throw new BadRequestException('Informe pelo menos um valor da análise');
    }
    if (dto.entregaId) {
      const entrega = await this.manager.findOne(EntregaLeite, {
        where: { id: dto.entregaId },
      });
      if (!entrega || entrega.fazendaId !== fazendaId) {
        throw new NotFoundException('Entrega não encontrada');
      }
      if (entrega.data.slice(0, 7) !== dto.mes) {
        throw new BadRequestException('O mês da análise é o mês da entrega');
      }
    }
  }

  private async buscar(fazendaId: string, id: string) {
    const analise = await this.manager.findOne(AnaliseLeite, { where: { id } });
    if (!analise || analise.fazendaId !== fazendaId) {
      throw new NotFoundException('Análise não encontrada');
    }
    if (analise.cancelamento.cancelado) {
      throw new BadRequestException('Esta análise foi cancelada');
    }
    return analise;
  }
}

function dadosDe(a: AnaliseLeite) {
  return {
    mes: a.mes,
    entregaId: a.entregaId ?? undefined,
    ccsMil: a.ccsMil ?? undefined,
    cbtMil: a.cbtMil ?? undefined,
    gordura: a.gordura ?? undefined,
    proteina: a.proteina ?? undefined,
  };
}

function somarMeses(mes: string, quantidade: number) {
  const [ano, m] = mes.split('-').map(Number);
  const total = ano * 12 + (m - 1) + quantidade;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}
