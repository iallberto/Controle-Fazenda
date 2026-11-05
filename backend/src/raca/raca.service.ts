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
  { nome: 'Nelore', gestacaoMediaDias: 291, leiteira: false },
  { nome: 'Simental', gestacaoMediaDias: 285, leiteira: false },
  { nome: 'Angus', gestacaoMediaDias: 282, leiteira: false },
  { nome: 'Brahman', gestacaoMediaDias: 292, leiteira: false },
  // Raças leiteiras (spec 004, FR-030)
  { nome: 'Holandesa', gestacaoMediaDias: 280, leiteira: true },
  { nome: 'Girolando', gestacaoMediaDias: 285, leiteira: true },
  { nome: 'Jersey', gestacaoMediaDias: 279, leiteira: true },
  { nome: 'Gir', gestacaoMediaDias: 290, leiteira: true },
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
          this.racaRepository.create({ ...padrao, fazendaId: null, criadoPorId: null }),
        );
      } else if (existe.leiteira !== padrao.leiteira) {
        existe.leiteira = padrao.leiteira;
        await this.racaRepository.save(existe);
      }
    }
  }

  async create(fazendaId: string, usuarioLogadoId: string, dto: CreateRacaDto) {
    await this.garantirNomeDisponivel(fazendaId, dto.nome);
    const raca = this.racaRepository.create({
      ...dto,
      nome: dto.nome.trim(),
      fazendaId,
      criadoPorId: usuarioLogadoId,
    });
    return this.racaRepository.save(raca);
  }

  findAll(fazendaId: string) {
    return this.racaRepository.find({
      where: [{ fazendaId: IsNull() }, { fazendaId }],
      order: { nome: 'ASC' },
    });
  }

  async findOne(fazendaId: string, id: string) {
    const raca = await this.racaRepository.findOneBy({ id });
    if (!raca) {
      throw new NotFoundException(`Raça ${id} não encontrada`);
    }
    if (raca.fazendaId !== null && raca.fazendaId !== fazendaId) {
      throw new NotFoundException(`Raça ${id} não encontrada`);
    }
    return raca;
  }

  async update(fazendaId: string, id: string, dto: UpdateRacaDto) {
    const raca = await this.findOne(fazendaId, id);
    if (raca.fazendaId === null) {
      throw new ForbiddenException('Raças padrão do sistema não podem ser alteradas');
    }
    if (dto.nome && dto.nome !== raca.nome) {
      await this.garantirNomeDisponivel(fazendaId, dto.nome, raca.id);
      dto.nome = dto.nome.trim();
    }
    Object.assign(raca, dto);
    return this.racaRepository.save(raca);
  }

  // Sem diferença de maiúsculas, acentos ou espaços: "girolando 3/4" é a mesma
  // raça que "Girolando 3/4" (o cadastro pela tela do Leite deixou isso visível)
  private async garantirNomeDisponivel(fazendaId: string, nome: string, ignorarId?: string) {
    const normalizar = (texto: string) =>
      texto
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
    const alvo = normalizar(nome);
    const racas = await this.racaRepository.find({
      where: [{ fazendaId: IsNull() }, { fazendaId }],
    });
    const existente = racas.find((r) => r.id !== ignorarId && normalizar(r.nome) === alvo);
    if (existente) {
      throw new ConflictException('Já existe uma raça com este nome disponível para esta fazenda');
    }
  }
}