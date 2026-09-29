import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Animal, StatusAnimal } from '../animal/entities/animal.entity';
import { Parto, ResultadoParto } from '../parto/entities/parto.entity';
import { Tratamento } from '../tratamento/entities/tratamento.entity';

@Injectable()
export class RelatorioService {
  constructor(
    @InjectRepository(Animal)
    private readonly animalRepository: Repository<Animal>,
    @InjectRepository(Parto)
    private readonly partoRepository: Repository<Parto>,
    @InjectRepository(Tratamento)
    private readonly tratamentoRepository: Repository<Tratamento>,
  ) {}

  async painelInicial(fazendaId: string) {
    const primeiroDiaDoMes = new Date();
    primeiroDiaDoMes.setDate(1);
    const inicioMes = primeiroDiaDoMes.toISOString().split('T')[0];

    const porCategoria = await this.animalRepository
      .createQueryBuilder('animal')
      .select('animal.categoria', 'categoria')
      .addSelect('COUNT(*)', 'total')
      .where('animal.fazendaId = :fazendaId', { fazendaId })
      .andWhere('animal.status = :status', { status: StatusAnimal.ATIVO })
      .groupBy('animal.categoria')
      .getRawMany();

    const porPasto = await this.animalRepository
      .createQueryBuilder('animal')
      .leftJoin('animal.pastoAtual', 'pasto')
      .select('pasto.nome', 'pasto')
      .addSelect('COUNT(*)', 'total')
      .where('animal.fazendaId = :fazendaId', { fazendaId })
      .andWhere('animal.status = :status', { status: StatusAnimal.ATIVO })
      .groupBy('pasto.nome')
      .getRawMany();

    const nascimentosNoMes = await this.partoRepository
      .createQueryBuilder('parto')
      .innerJoin('parto.mae', 'mae')
      .where('mae.fazendaId = :fazendaId', { fazendaId })
      .andWhere('parto.resultado = :resultado', { resultado: ResultadoParto.VIVO })
      .andWhere('parto.data >= :inicioMes', { inicioMes })
      .getCount();

    const obitosNoMes = await this.animalRepository
      .createQueryBuilder('animal')
      .where('animal.fazendaId = :fazendaId', { fazendaId })
      .andWhere('animal.status = :status', { status: StatusAnimal.MORTO })
      .andWhere('animal.dataStatus >= :inicioMes', { inicioMes })
      .getCount();

    return { porCategoria, porPasto, nascimentosNoMes, obitosNoMes };
  }
}