import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Fazenda } from './entities/fazenda.entity';
import { UpdateFazendaDto } from './dto/update-fazenda.dto';

@Injectable()
export class FazendaService {
  constructor(
    @InjectRepository(Fazenda)
    private readonly fazendaRepository: Repository<Fazenda>,
  ) {}

  async findOne(id: string) {
    const fazenda = await this.fazendaRepository.findOneBy({ id });
    if (!fazenda) {
      throw new NotFoundException(`Fazenda ${id} não encontrada`);
    }
    return fazenda;
  }

  async update(id: string, dto: UpdateFazendaDto) {
    const fazenda = await this.findOne(id);
    Object.assign(fazenda, dto);
    return this.fazendaRepository.save(fazenda);
  }
}
