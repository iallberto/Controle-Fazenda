import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, In } from 'typeorm';
import {
  Animal,
  Sexo,
  StatusAnimal,
  VacaDeLeite,
} from '../../animal/entities/animal.entity';
import { Parto } from '../../parto/entities/parto.entity';
import { hojeLocal } from '../../common/datas';
import { diasEntre, somarDias } from '../../reproducao/dominio/datas';
import { Lactacao } from './entities/lactacao.entity';
import { Ordenha, TipoOrdenha } from './entities/ordenha.entity';
import { calcularDel, carenciaAte, ehVacaDeLeite } from './dominio/regras';
import { carenciasDasVacas } from './lactacao-base';

export type SituacaoLeiteira = 'EM_LACTACAO' | 'SECA' | 'NENHUMA';

// Parto até este número de dias atrás ainda pode abrir lactação ao marcar a
// vaca como de leite (FR-004b)
const DIAS_PARTO_RECENTE = 305;

const porBrinco = (a: { brinco: string }, b: { brinco: string }) =>
  a.brinco.localeCompare(b.brinco, 'pt-BR', { numeric: true });

// Vacas de leite, situação leiteira e lactações (spec 004, FR-004 a FR-008)
@Injectable()
export class VacasService {
  constructor(
    @InjectEntityManager() private readonly manager: EntityManager,
  ) {}

  async listar(
    fazendaId: string,
    situacao: 'EM_LACTACAO' | 'SECA' | 'TODAS' = 'EM_LACTACAO',
    hoje = hojeLocal(),
  ) {
    const femeas = await this.manager.find(Animal, {
      where: { fazendaId, sexo: Sexo.F, status: StatusAnimal.ATIVO },
      relations: { raca: true },
    });
    const ids = femeas.map((f) => f.id);
    const [lactacoes, carencias] = await Promise.all([
      ids.length > 0
        ? this.manager.find(Lactacao, {
            where: { animalId: In(ids) },
            order: { inicio: 'DESC' },
          })
        : Promise.resolve([] as Lactacao[]),
      carenciasDasVacas(this.manager, ids),
    ]);
    const porVaca = new Map<string, Lactacao[]>();
    for (const l of lactacoes) {
      porVaca.set(l.animalId, [...(porVaca.get(l.animalId) ?? []), l]);
    }

    return femeas
      .map((femea) => {
        const daVaca = porVaca.get(femea.id) ?? [];
        const atual = daVaca.find((l) => l.fim === null) ?? null;
        const deLeite = ehVacaDeLeite(femea);
        if (!deLeite && !atual) return null;
        const situacaoLeiteira: SituacaoLeiteira = atual
          ? 'EM_LACTACAO'
          : daVaca.length > 0
            ? 'SECA'
            : 'NENHUMA';
        return {
          animalId: femea.id,
          brinco: femea.brinco,
          raca: femea.raca?.nome ?? null,
          situacao: situacaoLeiteira,
          inicio: atual?.inicio ?? null,
          del: atual ? calcularDel(atual.inicio, hoje) : null,
          carenciaAte: carenciaAte(carencias.get(femea.id) ?? [], hoje),
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null)
      .filter((v) => situacao === 'TODAS' || v.situacao === situacao)
      .sort(porBrinco);
  }

  async detalhar(fazendaId: string, animalId: string, hoje = hojeLocal()) {
    const animal = await this.buscarFemea(fazendaId, animalId);
    const [lactacoes, ordenhas, carencias] = await Promise.all([
      this.manager.find(Lactacao, {
        where: { animalId },
        order: { inicio: 'DESC' },
      }),
      this.manager.find(Ordenha, {
        where: { animalId, tipo: TipoOrdenha.VACA },
      }),
      carenciasDasVacas(this.manager, [animalId]),
    ]);

    const resumo = (lactacao: Lactacao) => {
      const porDia = new Map<string, number>();
      for (const o of ordenhas) {
        if (o.lactacaoId !== lactacao.id) continue;
        porDia.set(o.data, (porDia.get(o.data) ?? 0) + o.litros);
      }
      const dias = [...porDia.values()];
      const total = dias.reduce((s, v) => s + v, 0);
      return {
        totalLitros: arredondar(total),
        mediaPorDia: dias.length > 0 ? arredondar(total / dias.length) : null,
        pico: dias.length > 0 ? arredondar(Math.max(...dias)) : null,
        diasComOrdenha: dias.length,
      };
    };

    const atual = lactacoes.find((l) => l.fim === null) ?? null;
    const deLeite = ehVacaDeLeite(animal);
    return {
      animalId: animal.id,
      brinco: animal.brinco,
      raca: animal.raca?.nome ?? null,
      racaLeiteira: animal.raca?.leiteira ?? false,
      vacaDeLeite: animal.vacaDeLeite,
      ehVacaDeLeite: deLeite,
      situacao: (atual
        ? 'EM_LACTACAO'
        : lactacoes.length > 0
          ? 'SECA'
          : 'NENHUMA') as SituacaoLeiteira,
      lactacaoAtual: atual
        ? {
            id: atual.id,
            inicio: atual.inicio,
            origem: atual.origem,
            del: calcularDel(atual.inicio, hoje),
            ...resumo(atual),
          }
        : null,
      encerradas: lactacoes
        .filter((l) => l.fim !== null)
        .map((l) => ({
          id: l.id,
          inicio: l.inicio,
          fim: l.fim,
          motivoFim: l.motivoFim,
          dias: diasEntre(l.inicio, l.fim!) + 1,
          ...resumo(l),
        })),
      carenciaAte: carenciaAte(carencias.get(animalId) ?? [], hoje),
      partoRecente:
        deLeite && !atual
          ? await this.partoRecenteSemLactacao(animalId, lactacoes, hoje)
          : null,
    };
  }

  // Só o dono (FR-002, FR-004b)
  async alterarVacaDeLeite(
    fazendaId: string,
    usuarioId: string,
    animalId: string,
    vacaDeLeite: VacaDeLeite,
  ) {
    await this.buscarFemea(fazendaId, animalId);
    await this.manager.update(
      Animal,
      { id: animalId },
      { vacaDeLeite, atualizadoPorId: usuarioId },
    );
    return this.detalhar(fazendaId, animalId);
  }

  async buscarFemea(fazendaId: string, animalId: string) {
    const animal = await this.manager.findOne(Animal, {
      where: { id: animalId },
      relations: { raca: true },
    });
    if (!animal || animal.fazendaId !== fazendaId || animal.sexo !== Sexo.F) {
      throw new NotFoundException('Vaca não encontrada');
    }
    return animal;
  }

  // Último parto dos últimos 305 dias que ainda não abriu lactação (FR-004b)
  private async partoRecenteSemLactacao(
    animalId: string,
    lactacoes: Lactacao[],
    hoje: string,
  ) {
    const partos = await this.manager.find(Parto, {
      where: { maeId: animalId },
      order: { data: 'DESC' },
      take: 1,
    });
    const parto = partos[0];
    if (!parto || parto.data < somarDias(hoje, -DIAS_PARTO_RECENTE)) return null;
    if (lactacoes.some((l) => l.partoId === parto.id || l.inicio >= parto.data)) {
      return null;
    }
    return { partoId: parto.id, data: parto.data };
  }
}

function arredondar(valor: number) {
  return Math.round(valor * 10) / 10;
}
