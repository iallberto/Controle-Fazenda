import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Animal, CategoriaAnimal, OrigemAnimal, StatusAnimal } from './entities/animal.entity';
import { CreateAnimalDto } from './dto/create-animal.dto';
import { UpdateAnimalDto } from './dto/update-animal.dto';

@Injectable()
export class AnimalService {
  constructor(
    @InjectRepository(Animal)
    private readonly animalRepository: Repository<Animal>,
  ) {}

    async create(fazendaId: string, dto: CreateAnimalDto) {
    await this.garantirBrincoDisponivel(fazendaId, dto.brinco);

    if (dto.maeId) {
      await this.garantirParenteDaMesmaFazenda(fazendaId, dto.maeId, 'mãe');
    }
    if (dto.paiId) {
      await this.garantirParenteDaMesmaFazenda(fazendaId, dto.paiId, 'pai');
    }

    const animal = this.animalRepository.create({
      ...dto,
      fazendaId,
      status: StatusAnimal.ATIVO,
    });
    return this.animalRepository.save(animal);
  }

 findAll(fazendaId: string, categoria?: CategoriaAnimal) {
    const where = categoria ? { fazendaId, categoria } : { fazendaId };
    return this.animalRepository.find({ where });
  }

  async findOne(fazendaId: string, id: string) {
    const animal = await this.animalRepository.findOneBy({ id });
    if (!animal) {
      throw new NotFoundException(`Animal ${id} não encontrado`);
    }
    if (animal.fazendaId !== fazendaId) {
      throw new ForbiddenException('Este animal não pertence à sua fazenda');
    }
    return animal;
  }

  async update(fazendaId: string, id: string, dto: UpdateAnimalDto) {
    const animal = await this.findOne(fazendaId, id);
    if (dto.brinco && dto.brinco !== animal.brinco) {
      await this.garantirBrincoDisponivel(fazendaId, dto.brinco);
    }
    Object.assign(animal, dto);
    return this.animalRepository.save(animal);
  }

  async alterarStatus(
    fazendaId: string,
    id: string,
    novoStatus: StatusAnimal,
    motivo: string,
    data: string,
  ) {
    const animal = await this.findOne(fazendaId, id);
    animal.status = novoStatus;
    animal.motivoStatus = motivo;
    animal.dataStatus = data;
    return this.animalRepository.save(animal);
  }

  private async garantirBrincoDisponivel(fazendaId: string, brinco: string) {
    const existente = await this.animalRepository.findOneBy({ fazendaId, brinco });
    if (existente) {
      throw new ConflictException('Já existe um animal com este brinco nesta fazenda');
    }
  }

  private async garantirParenteDaMesmaFazenda(
    fazendaId: string,
    parenteId: string,
    papel: string,
  ) {
    const parente = await this.animalRepository.findOneBy({ id: parenteId });
    if (!parente) {
      throw new NotFoundException(`Animal indicado como ${papel} não encontrado`);
    }
    if (parente.fazendaId !== fazendaId) {
      throw new BadRequestException(`O animal indicado como ${papel} pertence a outra fazenda`);
    }
  }
}