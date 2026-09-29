import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
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

  async create(fazendaId: string, dto: CreatePastoDto) {
    await this.garantirNomeDisponivel(fazendaId, dto.nome);
    const pasto = this.pastoRepository.create({ ...dto, fazendaId });
    return this.pastoRepository.save(pasto);
  }

  findAll(fazendaId: string) {
    return this.pastoRepository.find({ where: { fazendaId } });
  }

  async findOne(fazendaId: string, id: string) {
    const pasto = await this.pastoRepository.findOneBy({ id });
    if (!pasto) {
      throw new NotFoundException(`Pasto ${id} não encontrado`);
    }
    if (pasto.fazendaId !== fazendaId) {
      throw new ForbiddenException('Este pasto não pertence à sua fazenda');
    }
    return pasto;
  }

  async update(fazendaId: string, id: string, dto: UpdatePastoDto) {
    const pasto = await this.findOne(fazendaId, id);
    if (dto.nome && dto.nome !== pasto.nome) {
      await this.garantirNomeDisponivel(fazendaId, dto.nome);
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