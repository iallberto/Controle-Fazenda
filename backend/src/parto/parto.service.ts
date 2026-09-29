import { Injectable, NotFoundException, BadRequestException,ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Parto, ResultadoParto } from './entities/parto.entity';
import { Animal, CategoriaAnimal, OrigemAnimal } from '../animal/entities/animal.entity';
import { CreatePartoDto } from './dto/create-parto.dto';
import { UpdatePartoDto } from './dto/update-parto.dto';

@Injectable()
export class PartoService {
  constructor(
    @InjectRepository(Parto)
    private readonly partoRepository: Repository<Parto>,
    @InjectRepository(Animal)
    private readonly animalRepository: Repository<Animal>,
  ) {}

    async create(fazendaId: string, dto: CreatePartoDto) {
    const mae = await this.animalRepository.findOneBy({ id: dto.maeId });
    if (!mae) {
      throw new NotFoundException('Matriz (mãe) não encontrada');
    }
    if (mae.fazendaId !== fazendaId) {
      throw new ForbiddenException('Esta matriz não pertence à sua fazenda');
    }

    if (dto.resultado === ResultadoParto.VIVO) {
      for (const cria of dto.crias ?? []) {
        const brincoExistente = await this.animalRepository.findOneBy({
          fazendaId: mae.fazendaId,
          brinco: cria.brinco,
        });
        if (brincoExistente) {
          throw new BadRequestException(
            `Já existe um animal com o brinco ${cria.brinco} nesta fazenda`,
          );
        }
      }
    }

    return this.partoRepository.manager.transaction(async (manager) => {
      const parto = manager.create(Parto, {
        maeId: dto.maeId,
        data: dto.data,
        tipo: dto.tipo,
        resultado: dto.resultado,
        observacoes: dto.observacoes ?? null,
      });
      const partoSalvo = await manager.save(parto);

      if (dto.resultado === ResultadoParto.VIVO) {
        for (const cria of dto.crias ?? []) {
          const animal = manager.create(Animal, {
            fazendaId: mae.fazendaId,
            brinco: cria.brinco,
            sexo: cria.sexo,
            categoria: CategoriaAnimal.BEZERRO,
            origem: OrigemAnimal.NASCIDO_FAZENDA,
            dataNascimento: dto.data,
            racaId: cria.racaId ?? mae.racaId,
            maeId: mae.id,
            partoId: partoSalvo.id,
          });
          await manager.save(animal);
        }
      }

      return manager.findOne(Parto, {
        where: { id: partoSalvo.id },
        relations: { crias: true },
      });
    });
  }

  findAll(fazendaId: string, maeId?: string) {
    const where = maeId ? { maeId, mae: { fazendaId } } : { mae: { fazendaId } };
    return this.partoRepository.find({ where, relations: { crias: true } });
  }

  async findOne(fazendaId: string, id: string) {
    const parto = await this.partoRepository.findOne({
      where: { id },
      relations: { crias: true, mae: true },
    });
    if (!parto) {
      throw new NotFoundException(`Parto ${id} não encontrado`);
    }
    if (parto.mae.fazendaId !== fazendaId) {
      throw new ForbiddenException('Este parto não pertence à sua fazenda');
    }
    return parto;
  }

  async update(fazendaId: string, id: string, dto: UpdatePartoDto) {
    const parto = await this.findOne(fazendaId, id);
    Object.assign(parto, dto);
    return this.partoRepository.save(parto);
  }
}