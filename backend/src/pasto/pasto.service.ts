import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pasto } from './entities/pasto.entity';
import { CreatePastoDto } from './dto/create-pasto.dto';
import { UpdatePastoDto } from './dto/update-pasto.dto';

@Injectable()
export class PastoService {
  constructor(
    @InjectRepository(Pasto)
    private readonly pastoRepository: Repository<Pasto>,
  ) {}

  async create(dto: CreatePastoDto) {
    await this.garantirNomeDisponivel(dto.fazendaId, dto.nome);
    const pasto = this.pastoRepository.create(dto);
    return this.pastoRepository.save(pasto);
  }

  findAll() {
    return this.pastoRepository.find();
  }

  async findOne(id: string) {
    const pasto = await this.pastoRepository.findOneBy({ id });
    if (!pasto) {
      throw new NotFoundException(`Pasto ${id} não encontrado`);
    }
    return pasto;
  }

  async update(id: string, dto: UpdatePastoDto) {
    const pasto = await this.findOne(id);
    if (dto.nome && dto.nome !== pasto.nome) {
      await this.garantirNomeDisponivel(pasto.fazendaId, dto.nome);
    }
    Object.assign(pasto, dto);
    return this.pastoRepository.save(pasto);
  }

  private async garantirNomeDisponivel(fazendaId: string, nome: string) {
    const existente = await this.pastoRepository.findOneBy({ fazendaId, nome });
    if (existente) {
      throw new ConflictException('Já existe um pasto com este nome nesta fazenda');
    }
  }
}