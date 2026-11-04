import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import {
  Between,
  EntityManager,
  In,
  IsNull,
  LessThanOrEqual,
  MoreThanOrEqual,
} from 'typeorm';
import { Animal } from '../../animal/entities/animal.entity';
import { hojeLocal } from '../../common/datas';
import { somarDias } from '../../reproducao/dominio/datas';
import { ModoOrdenha } from './entities/configuracao-leite.entity';
import { Lactacao } from './entities/lactacao.entity';
import { Ordenha, TipoOrdenha } from './entities/ordenha.entity';
import {
  calcularDel,
  carenciaAte,
  turnoPelaHora,
  validarLitrosDaVaca,
} from './dominio/regras';
import { carenciasDasVacas, lactacaoNaData } from './lactacao-base';
import { ConfiguracaoLeiteService } from './configuracao.service';
import { OrdenhaTanqueDto, OrdenhaVacaDto } from './dto/leite.dto';

const porBrinco = (a: { brinco: string }, b: { brinco: string }) =>
  a.brinco.localeCompare(b.brinco, 'pt-BR', { numeric: true });

const arredondar = (valor: number) => Math.round(valor * 10) / 10;

// Ordenha por vaca ou do tanque (spec 004, FR-009 a FR-014, FR-012a; R5)
@Injectable()
export class OrdenhasService {
  constructor(
    @InjectEntityManager() private readonly manager: EntityManager,
    private readonly configuracaoService: ConfiguracaoLeiteService,
  ) {}

  // Lista do turno: vacas em lactação na data, por brinco, com DEL, litros da
  // ordenha anterior e carência. No modo tanque, só as vacas em carência.
  async turno(
    fazendaId: string,
    usuarioId: string,
    filtro: { data?: string; turno?: number },
    agora = new Date(),
  ) {
    const configuracao = await this.configuracaoService.obter(fazendaId, usuarioId);
    const data = filtro.data ?? hojeLocal();
    const turno = Math.min(
      filtro.turno ?? turnoPelaHora(agora.getHours(), configuracao.ordenhasPorDia),
      configuracao.ordenhasPorDia,
    );

    const lactacoes = await this.lactacoesNaData(fazendaId, data);
    const ids = lactacoes.map((l) => l.animalId);
    const [carencias, recentes, tanque] = await Promise.all([
      carenciasDasVacas(this.manager, ids),
      ids.length > 0
        ? this.manager.find(Ordenha, {
            where: {
              animalId: In(ids),
              tipo: TipoOrdenha.VACA,
              data: Between(somarDias(data, -3), data),
            },
          })
        : Promise.resolve([] as Ordenha[]),
      this.manager.findOne(Ordenha, {
        where: { fazendaId, data, turno, tipo: TipoOrdenha.TANQUE },
      }),
    ]);

    const vacas = lactacoes
      .map((l) => {
        const daVaca = recentes.filter((o) => o.animalId === l.animalId);
        const doTurno = daVaca.find((o) => o.data === data && o.turno === turno);
        const anterior = daVaca
          .filter((o) => o.data < data || (o.data === data && o.turno < turno))
          .sort((a, b) => b.data.localeCompare(a.data) || b.turno - a.turno)[0];
        return {
          animalId: l.animalId,
          lactacaoId: l.id,
          brinco: l.animal!.brinco,
          raca: l.animal!.raca?.nome ?? null,
          del: calcularDel(l.inicio, data),
          litrosAnterior: anterior?.litros ?? null,
          carenciaAte: carenciaAte(carencias.get(l.animalId) ?? [], data),
          litros: doTurno?.litros ?? null,
          descarte: doTurno?.descarte ?? null,
        };
      })
      .filter(
        (v) => configuracao.modo === ModoOrdenha.POR_VACA || v.carenciaAte !== null,
      )
      .sort((a, b) => {
        // No modo tanque as vacas em carência já são as únicas; no modo por
        // vaca a ordem é só pelo brinco
        return porBrinco(a, b);
      });

    return {
      modo: configuracao.modo,
      ordenhasPorDia: configuracao.ordenhasPorDia,
      data,
      turno,
      vacas,
      tanque: tanque?.litros ?? null,
    };
  }

  async gravarVaca(
    fazendaId: string,
    usuarioId: string,
    dto: OrdenhaVacaDto,
    hoje = hojeLocal(),
  ) {
    const configuracao = await this.validarDataETurno(fazendaId, usuarioId, dto, hoje);
    const animal = await this.manager.findOne(Animal, {
      where: { id: dto.animalId },
    });
    if (!animal || animal.fazendaId !== fazendaId) {
      throw new NotFoundException('Vaca não encontrada');
    }
    const lactacao = await lactacaoNaData(this.manager, animal.id, dto.data);
    if (!lactacao) {
      throw new BadRequestException('Esta vaca não está em lactação nessa data');
    }

    const carencias = await carenciasDasVacas(this.manager, [animal.id]);
    const ate = carenciaAte(carencias.get(animal.id) ?? [], dto.data);
    if (configuracao.modo === ModoOrdenha.TANQUE && ate === null) {
      throw new BadRequestException(
        'No modo só tanque, só as vacas em carência são lançadas uma a uma',
      );
    }
    const erro = validarLitrosDaVaca(dto.litros, dto.confirmarAcima === true);
    if (erro) throw new BadRequestException(erro);

    const existente = await this.manager.findOne(Ordenha, {
      where: {
        fazendaId,
        data: dto.data,
        turno: dto.turno,
        animalId: animal.id,
        tipo: TipoOrdenha.VACA,
      },
    });
    const ordenha = existente ?? this.manager.create(Ordenha, {
      fazendaId,
      data: dto.data,
      turno: dto.turno,
      tipo: TipoOrdenha.VACA,
      animalId: animal.id,
      criadoPorId: usuarioId,
    });
    ordenha.lactacaoId = lactacao.id;
    ordenha.litros = dto.litros;
    ordenha.descarte = ate !== null;
    if (existente) ordenha.atualizadoPorId = usuarioId;
    const salva = await this.manager.save(ordenha);
    return {
      id: salva.id,
      animalId: animal.id,
      litros: salva.litros,
      descarte: salva.descarte,
      carenciaAte: ate,
    };
  }

  async gravarTanque(
    fazendaId: string,
    usuarioId: string,
    dto: OrdenhaTanqueDto,
    hoje = hojeLocal(),
  ) {
    const configuracao = await this.validarDataETurno(fazendaId, usuarioId, dto, hoje);
    if (configuracao.modo !== ModoOrdenha.TANQUE) {
      throw new BadRequestException(
        'A fazenda registra a ordenha por vaca; mude o modo nas configurações do Leite',
      );
    }
    const existente = await this.manager.findOne(Ordenha, {
      where: { fazendaId, data: dto.data, turno: dto.turno, tipo: TipoOrdenha.TANQUE },
    });
    const ordenha = existente ?? this.manager.create(Ordenha, {
      fazendaId,
      data: dto.data,
      turno: dto.turno,
      tipo: TipoOrdenha.TANQUE,
      animalId: null,
      lactacaoId: null,
      descarte: false,
      criadoPorId: usuarioId,
    });
    ordenha.litros = dto.litros;
    if (existente) ordenha.atualizadoPorId = usuarioId;
    const salva = await this.manager.save(ordenha);
    return { id: salva.id, litros: salva.litros };
  }

  // Total do dia por vaca e da fazenda, separando tanque e descarte (FR-013)
  async dia(fazendaId: string, data = hojeLocal()) {
    const ordenhas = await this.manager.find(Ordenha, {
      where: { fazendaId, data },
      relations: { animal: true },
    });
    const vacas = new Map<
      string,
      { animalId: string; brinco: string; turnos: Record<number, number>; total: number; descarte: number }
    >();
    const tanque: Record<number, number> = {};
    let paraTanque = 0;
    let descartado = 0;
    for (const o of ordenhas) {
      if (o.descarte) descartado += o.litros;
      else paraTanque += o.litros;
      if (o.tipo === TipoOrdenha.TANQUE) {
        tanque[o.turno] = o.litros;
        continue;
      }
      const vaca = vacas.get(o.animalId!) ?? {
        animalId: o.animalId!,
        brinco: o.animal?.brinco ?? '',
        turnos: {},
        total: 0,
        descarte: 0,
      };
      vaca.turnos[o.turno] = o.litros;
      vaca.total = arredondar(vaca.total + o.litros);
      if (o.descarte) vaca.descarte = arredondar(vaca.descarte + o.litros);
      vacas.set(o.animalId!, vaca);
    }
    return {
      data,
      vacas: [...vacas.values()].sort(porBrinco),
      tanque,
      paraTanque: arredondar(paraTanque),
      descartado: arredondar(descartado),
    };
  }

  private async validarDataETurno(
    fazendaId: string,
    usuarioId: string,
    dto: { data: string; turno: number },
    hoje: string,
  ) {
    if (dto.data > hoje) {
      throw new BadRequestException('A ordenha não pode ser lançada no futuro');
    }
    const configuracao = await this.configuracaoService.obter(fazendaId, usuarioId);
    if (dto.turno > configuracao.ordenhasPorDia) {
      throw new BadRequestException(
        `A fazenda faz ${configuracao.ordenhasPorDia} ordenha(s) por dia`,
      );
    }
    return configuracao;
  }

  private lactacoesNaData(fazendaId: string, data: string) {
    return this.manager.find(Lactacao, {
      where: [
        { fazendaId, inicio: LessThanOrEqual(data), fim: IsNull() },
        { fazendaId, inicio: LessThanOrEqual(data), fim: MoreThanOrEqual(data) },
      ],
      relations: { animal: { raca: true } },
    });
  }
}
