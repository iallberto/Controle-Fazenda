import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Veterinario } from './entities/veterinario.entity';
import { CreateVeterinarioDto } from './dto/create-veterinario.dto';

@Injectable()
export class VeterinarioService {
  constructor(
    @InjectRepository(Veterinario)
    private readonly veterinarioRepository: Repository<Veterinario>,
  ) {}

  create(fazendaId: string, usuarioId: string, dto: CreateVeterinarioDto) {
    const veterinario = this.veterinarioRepository.create({
      fazendaId,
      nome: dto.nome,
      crmv: dto.crmv ?? null,
      criadoPorId: usuarioId,
      ativo: true,
    });
    return this.veterinarioRepository.save(veterinario);
  }

  findAll(fazendaId: string, incluirInativos?: boolean) {
    const where = incluirInativos ? { fazendaId } : { fazendaId, ativo: true };
    return this.veterinarioRepository.find({ where });
  }

  async inativar(fazendaId: string, id: string) {
    const veterinario = await this.veterinarioRepository.findOneBy({ id });
    if (!veterinario) {
      throw new NotFoundException(`Veterinário ${id} não encontrado`);
    }
    if (veterinario.fazendaId !== fazendaId) {
      throw new ForbiddenException('Este veterinário não pertence à sua fazenda');
    }
    veterinario.ativo = false;
    return this.veterinarioRepository.save(veterinario);
  }
}