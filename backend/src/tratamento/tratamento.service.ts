import { Injectable, NotFoundException,ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tratamento } from './entities/tratamento.entity';
import { Animal } from '../animal/entities/animal.entity';
import { CreateTratamentoDto } from './dto/create-tratamento.dto';
import { UpdateTratamentoDto } from './dto/update-tratamento.dto';

@Injectable()
export class TratamentoService {
  constructor(
    @InjectRepository(Tratamento)
    private readonly tratamentoRepository: Repository<Tratamento>,
    @InjectRepository(Animal)
    private readonly animalRepository: Repository<Animal>,
  ) {}

  async create(fazendaId: string, dto: CreateTratamentoDto) {
    const animal = await this.animalRepository.findOneBy({ id: dto.animalId });
    if (!animal) {
      throw new NotFoundException('Animal não encontrado');
    }
    if (animal.fazendaId !== fazendaId) {
      throw new ForbiddenException('Este animal não pertence à sua fazenda');
    }

    const tratamento = this.tratamentoRepository.create({
      animalId: dto.animalId,
      produto: dto.produto,
      data: dto.data,
      responsavel: dto.responsavel,
      recorrenciaDias: dto.recorrenciaDias ?? null,
      proximaDataPrevista: this.calcularProximaData(dto.data, dto.recorrenciaDias),
    });
    return this.tratamentoRepository.save(tratamento);
  }

    findAll(fazendaId: string, animalId?: string) {
    const where = animalId
      ? { animalId, animal: { fazendaId } }
      : { animal: { fazendaId } };
    return this.tratamentoRepository.find({ where });
  }

  async findOne(fazendaId: string, id: string) {
    const tratamento = await this.tratamentoRepository.findOne({
      where: { id },
      relations: { animal: true },
    });
    if (!tratamento) {
      throw new NotFoundException(`Tratamento ${id} não encontrado`);
    }
    if (tratamento.animal.fazendaId !== fazendaId) {
      throw new ForbiddenException('Este tratamento não pertence à sua fazenda');
    }
    return tratamento;
  }

  async update(fazendaId: string, id: string, dto: UpdateTratamentoDto) {
    const tratamento = await this.findOne(fazendaId, id);
    Object.assign(tratamento, dto);

    const novaData = dto.data ?? tratamento.data;
    const novaRecorrencia = dto.recorrenciaDias ?? tratamento.recorrenciaDias;
    tratamento.proximaDataPrevista = this.calcularProximaData(novaData, novaRecorrencia);

    return this.tratamentoRepository.save(tratamento);
  }

  private calcularProximaData(data: string, recorrenciaDias?: number | null): string | null {
    if (!recorrenciaDias) {
      return null;
    }
    const base = new Date(data + 'T00:00:00');
    base.setDate(base.getDate() + recorrenciaDias);
    return base.toISOString().split('T')[0];
  }
}