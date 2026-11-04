import { Injectable, OnModuleInit } from '@nestjs/common';
import { EntityManager, IsNull } from 'typeorm';
import { EventosRebanho, ganchosRebanho } from '../../common/ganchos-rebanho';
import { LoteAnimal } from './entities/lote-alimentacao.entity';

// A Nutrição reage à saída do rebanho (spec 005, FR-010b; research R4): o
// animal vendido, morto ou descartado sai do lote de alimentação na data da
// saída, com o módulo em qualquer situação (o histórico fica certo).
@Injectable()
export class GanchosNutricao implements OnModuleInit {
  onModuleInit() {
    ganchosRebanho.registrar('saidaDoRebanho', (m, d) => this.aoSairDoRebanho(m, d));
  }

  async aoSairDoRebanho(manager: EntityManager, dados: EventosRebanho['saidaDoRebanho']) {
    const aberta = await manager.findOne(LoteAnimal, {
      where: { animalId: dados.animalId, saida: IsNull() },
    });
    if (!aberta) return;
    aberta.saida = dados.data < aberta.entrada ? aberta.entrada : dados.data;
    aberta.retiradoPorId = dados.usuarioId;
    await manager.save(aberta);
  }
}
