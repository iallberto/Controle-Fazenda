import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { StatusAnimal } from '../../animal/entities/animal.entity';
import { hojeLocal } from '../../common/datas';
import { CarenciaLeite } from './entities/carencia-leite.entity';

// Vacas com leite em descarte hoje, para o Manejo (spec 004, FR-018)
@Injectable()
export class CarenciasService {
  constructor(
    @InjectEntityManager() private readonly manager: EntityManager,
  ) {}

  async hoje(fazendaId: string, hoje = hojeLocal()) {
    const carencias = await this.manager.find(CarenciaLeite, {
      where: {
        fazendaId,
        data: LessThanOrEqual(hoje),
        dataFim: MoreThanOrEqual(hoje),
      },
      relations: { animal: true, produto: true },
    });
    // Uma linha por vaca: vale a data final mais distante
    const porVaca = new Map<
      string,
      { animalId: string; brinco: string; produto: string; dataFim: string }
    >();
    for (const c of carencias) {
      if (c.animal?.status !== StatusAnimal.ATIVO) continue;
      const atual = porVaca.get(c.animalId);
      if (!atual || c.dataFim > atual.dataFim) {
        porVaca.set(c.animalId, {
          animalId: c.animalId,
          brinco: c.animal.brinco,
          produto: c.produto?.nome ?? '',
          dataFim: c.dataFim,
        });
      }
    }
    return [...porVaca.values()].sort((a, b) =>
      a.brinco.localeCompare(b.brinco, 'pt-BR', { numeric: true }),
    );
  }
}
