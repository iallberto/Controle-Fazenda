import {
  Injectable,
  OnModuleInit,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Raca } from './entities/raca.entity';
import { CreateRacaDto } from './dto/create-raca.dto';
import { UpdateRacaDto } from './dto/update-raca.dto';

const RACAS_PADRAO = [
  { nome: 'Nelore', gestacaoMediaDias: 291 },
  { nome: 'Simental', gestacaoMediaDias: 285 },
  { nome: 'Angus', gestacaoMediaDias: 282 },
  { nome: 'Brahman', gestacaoMediaDias: 292 },
];

@Injectable()
export class RacaService implements OnModuleInit {
  constructor(
    @InjectRepository(Raca)
    private readonly racaRepository: Repository<Raca>,
  ) {}

  async onModuleInit() {
    for (const padrao of RACAS_PADRAO) {
      const existe = await this.racaRepository.findOneBy({
        nome: padrao.nome,
        fazendaId: IsNull(),
      });
      if (!existe) {
        await this.racaRepository.save(
          this.racaRepository.create({ ...padrao, fazendaId: null }),
        );
      }
    }
  }

  async create(dto: CreateRacaDto) {
    await this.garantirNomeDisponivel(dto.fazendaId, dto.nome);
    const raca = this.racaRepository.create(dto);
    return this.racaRepository.save(raca);
  }

  findAll(fazendaId?: string) {
    if (!fazendaId) {
      return this.racaRepository.findBy({ fazendaId: IsNull() });
    }
    return this.racaRepository.find({
      where: [{ fazendaId: IsNull() }, { fazendaId }],
      order: { nome: 'ASC' },
    });
  }

  async findOne(id: string) {
    const raca = await this.racaRepository.findOneBy({ id });
    if (!raca) {
      throw new NotFoundException(`Raça ${id} não encontrada`);
    }
    return raca;
  }

  async update(id: string, dto: UpdateRacaDto) {
    const raca = await this.findOne(id);
    if (raca.fazendaId === null) {
      throw new ForbiddenException('Raças padrão do sistema não podem ser alteradas');
    }
    if (dto.nome && dto.nome !== raca.nome) {
      await this.garantirNomeDisponivel(raca.fazendaId, dto.nome);
    }
    Object.assign(raca, dto);
    return this.racaRepository.save(raca);
  }

  private async garantirNomeDisponivel(fazendaId: string, nome: string) {
    const existente = await this.racaRepository.findOne({
      where: [
        { nome, fazendaId: IsNull() },
        { nome, fazendaId },
      ],
    });
    if (existente) {
      throw new ConflictException('Já existe uma raça com este nome disponível para esta fazenda');
    }
  }
}