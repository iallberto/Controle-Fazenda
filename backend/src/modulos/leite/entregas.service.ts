import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Between, EntityManager } from 'typeorm';
import { PapelUsuario } from '../../usuario/entities/usuario.entity';
import { hojeLocal } from '../../common/datas';
import { EntregaLeite } from './entities/entrega-leite.entity';
import { Ordenha } from './entities/ordenha.entity';
import { garantirMesAberto } from './mes-recebido';
import {
  CriarEntregaDto,
  EditarEntregaDto,
} from './dto/leite.dto';

const arredondar = (valor: number) => Math.round(valor * 10) / 10;

// Primeiro e último dia de um mês AAAA-MM
export function limitesDoMes(mes: string) {
  const [ano, m] = mes.split('-').map(Number);
  const ultimo = new Date(Date.UTC(ano, m, 0)).getUTCDate();
  return { de: `${mes}-01`, ate: `${mes}-${String(ultimo).padStart(2, '0')}` };
}

// Valor da entrega em centavos: litros × preço, arredondado ao centavo
export function valorDaEntrega(litros: number, precoLitroCentavos: number | null) {
  return precoLitroCentavos === null ? null : Math.round(litros * precoLitroCentavos);
}

// Entregas ao laticínio (spec 004, US4, FR-022, FR-023, FR-025; research R9).
// Preço e valor só para o dono: a resposta ao funcionário não tem dinheiro.
@Injectable()
export class EntregasService {
  constructor(
    @InjectEntityManager() private readonly manager: EntityManager,
  ) {}

  async listar(fazendaId: string, papel: string, mes = hojeLocal().slice(0, 7)) {
    const { de, ate } = limitesDoMes(mes);
    const [entregas, ordenhas] = await Promise.all([
      this.manager.find(EntregaLeite, {
        where: { fazendaId, data: Between(de, ate) },
        order: { data: 'ASC', criadoEm: 'ASC' },
      }),
      this.manager.find(Ordenha, {
        where: { fazendaId, data: Between(de, ate), descarte: false },
      }),
    ]);
    const validas = entregas.filter((e) => !e.cancelamento.cancelado);
    const totalLitros = arredondar(validas.reduce((s, e) => s + e.litros, 0));
    const paraTanque = arredondar(ordenhas.reduce((s, o) => s + o.litros, 0));
    const ehDono = papel === PapelUsuario.DONO;

    const lista = entregas.map((e) => {
      const base = {
        id: e.id,
        data: e.data,
        litros: e.litros,
        observacao: e.observacao,
        cancelamento: {
          cancelado: e.cancelamento.cancelado,
          motivoCancelamento: e.cancelamento.motivoCancelamento,
        },
      };
      return ehDono
        ? {
            ...base,
            precoLitroCentavos: e.precoLitroCentavos,
            valorCentavos: valorDaEntrega(e.litros, e.precoLitroCentavos),
          }
        : base;
    });
    const resumo = {
      mes,
      entregas: lista,
      totalLitros,
      paraTanque,
      diferenca: arredondar(paraTanque - totalLitros),
    };
    if (!ehDono) return resumo;
    const comPreco = validas.filter((e) => e.precoLitroCentavos !== null);
    return {
      ...resumo,
      totalCentavos: comPreco.reduce((s, e) => s + valorDaEntrega(e.litros, e.precoLitroCentavos)!, 0),
      entregasSemPreco: validas.length - comPreco.length,
    };
  }

  async criar(
    fazendaId: string,
    usuarioId: string,
    papel: string,
    dto: CriarEntregaDto,
    hoje = hojeLocal(),
  ) {
    if (dto.precoLitroCentavos !== undefined && papel !== PapelUsuario.DONO) {
      throw new ForbiddenException('O preço do leite é informado pelo dono');
    }
    if (dto.data > hoje) {
      throw new BadRequestException('A entrega não pode ser no futuro');
    }
    await garantirMesAberto(this.manager, fazendaId, [dto.data]);
    const salva = await this.manager.save(
      this.manager.create(EntregaLeite, {
        fazendaId,
        data: dto.data,
        litros: dto.litros,
        observacao: dto.observacao ?? null,
        precoLitroCentavos: dto.precoLitroCentavos ?? null,
        criadoPorId: usuarioId,
      }),
    );
    return { id: salva.id, data: salva.data, litros: salva.litros };
  }

  async editar(
    fazendaId: string,
    usuarioId: string,
    id: string,
    dto: EditarEntregaDto,
    hoje = hojeLocal(),
  ) {
    const entrega = await this.buscar(fazendaId, id);
    if (dto.data && dto.data > hoje) {
      throw new BadRequestException('A entrega não pode ser no futuro');
    }
    await garantirMesAberto(this.manager, fazendaId, [entrega.data, dto.data ?? entrega.data]);
    Object.assign(entrega, dto, { atualizadoPorId: usuarioId });
    const salva = await this.manager.save(entrega);
    return { id: salva.id, data: salva.data, litros: salva.litros };
  }

  async cancelar(fazendaId: string, usuarioId: string, id: string, motivo: string) {
    const entrega = await this.buscar(fazendaId, id);
    await garantirMesAberto(this.manager, fazendaId, [entrega.data]);
    entrega.cancelamento = {
      cancelado: true,
      canceladoEm: new Date(),
      canceladoPorId: usuarioId,
      motivoCancelamento: motivo,
    };
    entrega.atualizadoPorId = usuarioId;
    await this.manager.save(entrega);
    return { cancelada: true };
  }

  // Só o dono (rota com @Roles)
  async informarPreco(fazendaId: string, usuarioId: string, id: string, preco: number) {
    const entrega = await this.buscar(fazendaId, id);
    await garantirMesAberto(this.manager, fazendaId, [entrega.data]);
    entrega.precoLitroCentavos = preco;
    entrega.atualizadoPorId = usuarioId;
    await this.manager.save(entrega);
    return { id, precoLitroCentavos: preco };
  }

  // Só o dono: o mesmo preço para todas as entregas não canceladas do mês
  async informarPrecoDoMes(fazendaId: string, usuarioId: string, mes: string, preco: number) {
    await garantirMesAberto(this.manager, fazendaId, [`${mes}-01`]);
    const { de, ate } = limitesDoMes(mes);
    const entregas = await this.manager.find(EntregaLeite, {
      where: { fazendaId, data: Between(de, ate), cancelamento: { cancelado: false } },
    });
    for (const entrega of entregas) {
      entrega.precoLitroCentavos = preco;
      entrega.atualizadoPorId = usuarioId;
    }
    await this.manager.save(entregas);
    return { atualizadas: entregas.length };
  }

  private async buscar(fazendaId: string, id: string) {
    const entrega = await this.manager.findOne(EntregaLeite, { where: { id } });
    if (!entrega || entrega.fazendaId !== fazendaId) {
      throw new NotFoundException('Entrega não encontrada');
    }
    if (entrega.cancelamento.cancelado) {
      throw new BadRequestException('Esta entrega foi cancelada');
    }
    return entrega;
  }
}
