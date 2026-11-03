import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pesagem } from './entities/pesagem.entity';
import { Animal } from '../animal/entities/animal.entity';
import { CreatePesagemDto } from './dto/create-pesagem.dto';
import { calcularGmd } from './gmd';
import { garantirAnimalAtivo, garantirUsuarioDaFazenda } from '../common/vinculos';

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
    garantirAnimalAtivo(animal);
    if (dto.pesadoPorId) {
      await garantirUsuarioDaFazenda(
        this.pesagemRepository.manager,
        fazendaId,
        dto.pesadoPorId,
        'informado como responsável pela pesagem',
      );
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
      // criadoEm desempata pesagens do mesmo dia
      order: { data: 'ASC', criadoEm: 'ASC' },
    });

    return calcularGmd(pesagens);
  }
}