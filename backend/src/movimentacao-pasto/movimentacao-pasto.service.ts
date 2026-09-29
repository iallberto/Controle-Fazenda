import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { MovimentacaoPasto } from './entities/movimentacao-pasto.entity';
import { Animal } from '../animal/entities/animal.entity';
import { Pasto } from '../pasto/entities/pasto.entity';
import { MoverAnimalDto } from './dto/mover-animal.dto';

@Injectable()
export class MovimentacaoPastoService {
  constructor(
    @InjectRepository(MovimentacaoPasto)
    private readonly movimentacaoRepository: Repository<MovimentacaoPasto>,
    @InjectRepository(Animal)
    private readonly animalRepository: Repository<Animal>,
    @InjectRepository(Pasto)
    private readonly pastoRepository: Repository<Pasto>,
  ) {}

  async mover(fazendaId: string, dto: MoverAnimalDto) {
    const animal = await this.animalRepository.findOneBy({ id: dto.animalId });
    if (!animal || animal.fazendaId !== fazendaId) {
      throw new NotFoundException('Animal não encontrado');
    }

    const pasto = await this.pastoRepository.findOneBy({ id: dto.pastoId });
    if (!pasto || pasto.fazendaId !== fazendaId) {
      throw new NotFoundException('Pasto não encontrado');
    }

    const data = dto.data ?? new Date().toISOString().split('T')[0];

    return this.movimentacaoRepository.manager.transaction(async (manager) => {
      const movimentacaoAberta = await manager.findOne(MovimentacaoPasto, {
        where: { animalId: animal.id, dataSaida: IsNull() },
      });
      if (movimentacaoAberta) {
        movimentacaoAberta.dataSaida = data;
        await manager.save(movimentacaoAberta);
      }

      const novaMovimentacao = manager.create(MovimentacaoPasto, {
        animalId: animal.id,
        pastoId: pasto.id,
        dataEntrada: data,
        dataSaida: null,
      });
      await manager.save(novaMovimentacao);

      animal.pastoAtualId = pasto.id;
      await manager.save(animal);

      return novaMovimentacao;
    });
  }

  async historico(fazendaId: string, animalId: string) {
    const animal = await this.animalRepository.findOneBy({ id: animalId });
    if (!animal || animal.fazendaId !== fazendaId) {
      throw new NotFoundException('Animal não encontrado');
    }

    return this.movimentacaoRepository.find({
      where: { animalId },
      relations: { pasto: true },
      order: { dataEntrada: 'DESC' },
    });
  }
}