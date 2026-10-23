import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pesagem } from './entities/pesagem.entity';
import { Animal } from '../animal/entities/animal.entity';
import { CreatePesagemDto } from './dto/create-pesagem.dto';

@Injectable()
export class PesagemService {
  constructor(
    @InjectRepository(Pesagem)
    private readonly pesagemRepository: Repository<Pesagem>,
    @InjectRepository(Animal)
    private readonly animalRepository: Repository<Animal>,
  ) {}

  async create(fazendaId: string, usuarioLogadoId: string, dto: CreatePesagemDto) {
    const animal = await this.animalRepository.findOneBy({ id: dto.animalId });
    if (!animal || animal.fazendaId !== fazendaId) {
      throw new NotFoundException('Animal não encontrado');
    }

    const pesagem = this.pesagemRepository.create({
      animalId: dto.animalId,
      pesoKg: dto.pesoKg,
      data: dto.data,
      pesadoPorId: dto.pesadoPorId ?? usuarioLogadoId,
      lancadoPorId: usuarioLogadoId,
      observacao: dto.observacao ?? null,
    });
    return this.pesagemRepository.save(pesagem);
  }

  async findAllPorAnimal(fazendaId: string, animalId: string) {
    const animal = await this.animalRepository.findOneBy({ id: animalId });
    if (!animal || animal.fazendaId !== fazendaId) {
      throw new NotFoundException('Animal não encontrado');
    }

    const pesagens = await this.pesagemRepository.find({
      where: { animalId },
      order: { data: 'ASC' },
    });

    return pesagens.map((pesagem, indice) => {
      if (indice === 0) {
        return { ...pesagem, gmdDesdeAnterior: null };
      }
      const anterior = pesagens[indice - 1];
      const dias =
        (new Date(pesagem.data).getTime() - new Date(anterior.data).getTime()) /
        (1000 * 60 * 60 * 24);
      const ganho = Number(pesagem.pesoKg) - Number(anterior.pesoKg);
      const gmd = dias > 0 ? Number((ganho / dias).toFixed(2)) : null;
      return { ...pesagem, gmdDesdeAnterior: gmd };
    });
  }
}