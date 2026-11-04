import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, Repository } from 'typeorm';
import { Animal, Sexo } from '../animal/entities/animal.entity';
import { Raca } from '../raca/entities/raca.entity';
import { AplicadoPorTipo } from '../tratamento/entities/tratamento.entity';
import { TratamentoService } from '../tratamento/tratamento.service';
import { Semen } from './entities/semen.entity';
import { Inseminacao } from './entities/inseminacao.entity';
import { SituacaoService } from './situacao.service';
import {
  EditarInseminacaoDto,
  EntradaDosesDto,
  InseminacaoDto,
  SemenDto,
} from './dto/inseminacao.dto';

// Sêmen e inseminação artificial (US5). A dose sai do estoque na mesma
// transação da inseminação, de forma atômica (research R8).
@Injectable()
export class InseminacaoService {
  constructor(
    @InjectRepository(Semen)
    private readonly semenRepository: Repository<Semen>,
    @InjectRepository(Inseminacao)
    private readonly inseminacaoRepository: Repository<Inseminacao>,
    @InjectRepository(Animal)
    private readonly animalRepository: Repository<Animal>,
    @InjectRepository(Raca)
    private readonly racaRepository: Repository<Raca>,
    private readonly situacaoService: SituacaoService,
    private readonly tratamentoService: TratamentoService,
  ) {}

  // --- Sêmen ---------------------------------------------------------------

  async listarSemens(fazendaId: string) {
    const semens = await this.semenRepository.find({
      where: { fazendaId },
      relations: { raca: true },
    });
    return semens.sort((a, b) =>
      a.nomeTouro.localeCompare(b.nomeTouro, 'pt-BR', { numeric: true }),
    );
  }

  async cadastrarSemen(fazendaId: string, usuarioId: string, dto: SemenDto) {
    if (dto.racaId) await this.validarRaca(fazendaId, dto.racaId);
    return this.semenRepository.save(
      this.semenRepository.create({
        fazendaId,
        nomeTouro: dto.nomeTouro,
        racaId: dto.racaId ?? null,
        central: dto.central || null,
        doses: dto.doses,
        criadoPorId: usuarioId,
      }),
    );
  }

  // Compra de doses (FR-012)
  async entradaDoses(
    fazendaId: string,
    usuarioId: string,
    id: string,
    dto: EntradaDosesDto,
  ) {
    await this.buscarSemen(fazendaId, id);
    await this.semenRepository.increment({ id }, 'doses', dto.doses);
    await this.semenRepository.update({ id }, { atualizadoPorId: usuarioId });
    return this.buscarSemen(fazendaId, id);
  }

  // Só o dono, e só sêmen que nunca foi usado (FR-024)
  async excluirSemen(fazendaId: string, id: string) {
    await this.buscarSemen(fazendaId, id);
    const usos = await this.inseminacaoRepository.count({
      where: { semenId: id },
    });
    if (usos > 0) {
      throw new ConflictException(
        'Este sêmen já foi usado em inseminação e fica no histórico',
      );
    }
    await this.semenRepository.delete({ id });
  }

  // --- Inseminação ---------------------------------------------------------

  async listar(fazendaId: string, femeaId?: string) {
    return this.inseminacaoRepository.find({
      where: {
        femea: { fazendaId },
        ...(femeaId && { femeaId }),
      },
      relations: {
        femea: true,
        semen: true,
        aplicadoPorUsuario: true,
        aplicadoPorVeterinario: true,
      },
      order: { data: 'DESC', criadoEm: 'DESC' },
      take: femeaId ? undefined : 50,
    });
  }

  async registrar(fazendaId: string, usuarioId: string, dto: InseminacaoDto) {
    const femea = await this.animalRepository.findOneBy({ id: dto.femeaId });
    if (!femea || femea.fazendaId !== fazendaId) {
      throw new NotFoundException('Animal não encontrado');
    }
    if (femea.sexo !== Sexo.F) {
      throw new BadRequestException('Inseminação só em fêmea');
    }
    const motivo = await this.situacaoService.motivoInaptidao(femea, dto.data);
    if (motivo) {
      throw new BadRequestException(
        `A fêmea ${femea.brinco} não pode ser inseminada: ${motivo}`,
      );
    }
    await this.buscarSemen(fazendaId, dto.semenId);
    await this.tratamentoService.validarAplicador(
      fazendaId,
      dto.aplicadoPorTipo,
      dto.aplicadoPorUsuarioId,
      dto.aplicadoPorVeterinarioId,
    );

    return this.inseminacaoRepository.manager.transaction(async (manager) => {
      await this.baixarDose(manager, dto.semenId);
      return manager.save(
        manager.create(Inseminacao, {
          ...this.dadosAplicador(dto),
          femeaId: femea.id,
          data: dto.data,
          tipo: dto.tipo,
          semenId: dto.semenId,
          criadoPorId: usuarioId,
        }),
      );
    });
  }

  // Só o dono (FR-026). Trocar o sêmen devolve a dose ao antigo e baixa do novo.
  async editar(
    fazendaId: string,
    usuarioId: string,
    id: string,
    dto: EditarInseminacaoDto,
  ) {
    const inseminacao = await this.buscarInseminacao(fazendaId, id);
    if (inseminacao.cancelamento.cancelado) {
      throw new BadRequestException(
        'Inseminação cancelada não pode ser editada',
      );
    }
    const trocaSemen = !!dto.semenId && dto.semenId !== inseminacao.semenId;
    if (trocaSemen) await this.buscarSemen(fazendaId, dto.semenId!);
    if (dto.aplicadoPorTipo) {
      await this.tratamentoService.validarAplicador(
        fazendaId,
        dto.aplicadoPorTipo,
        dto.aplicadoPorUsuarioId,
        dto.aplicadoPorVeterinarioId,
      );
    }

    return this.inseminacaoRepository.manager.transaction(async (manager) => {
      if (trocaSemen) {
        await this.baixarDose(manager, dto.semenId!);
        await manager.increment(Semen, { id: inseminacao.semenId }, 'doses', 1);
      }
      await manager.update(
        Inseminacao,
        { id },
        {
          data: dto.data ?? inseminacao.data,
          tipo: dto.tipo ?? inseminacao.tipo,
          semenId: dto.semenId ?? inseminacao.semenId,
          ...(dto.aplicadoPorTipo &&
            this.dadosAplicador(dto as InseminacaoDto)),
          atualizadoPorId: usuarioId,
        },
      );
      return manager.findOneBy(Inseminacao, { id });
    });
  }

  // Só o dono: fica no histórico, fora dos cálculos, e a dose volta ao estoque
  async cancelar(
    fazendaId: string,
    usuarioId: string,
    id: string,
    motivo: string,
  ) {
    const inseminacao = await this.buscarInseminacao(fazendaId, id);
    if (inseminacao.cancelamento.cancelado) {
      throw new BadRequestException('Este registro já foi cancelado');
    }
    await this.inseminacaoRepository.manager.transaction(async (manager) => {
      await manager.update(
        Inseminacao,
        { id },
        {
          cancelamento: {
            cancelado: true,
            canceladoEm: new Date(),
            canceladoPorId: usuarioId,
            motivoCancelamento: motivo.trim(),
          },
          atualizadoPorId: usuarioId,
        },
      );
      await manager.increment(Semen, { id: inseminacao.semenId }, 'doses', 1);
    });
    return { cancelado: true };
  }

  // Duas inseminações ao mesmo tempo nunca usam a mesma última dose (FR-011)
  private async baixarDose(manager: EntityManager, semenId: string) {
    const resultado = await manager
      .createQueryBuilder()
      .update(Semen)
      .set({ doses: () => 'doses - 1' })
      .where('id = :id AND doses > 0', { id: semenId })
      .execute();
    if (!resultado.affected) {
      throw new ConflictException(
        'Este sêmen não tem mais doses em estoque. Registre a entrada de doses antes.',
      );
    }
  }

  private dadosAplicador(dto: {
    aplicadoPorTipo: AplicadoPorTipo;
    aplicadoPorUsuarioId?: string;
    aplicadoPorVeterinarioId?: string;
  }) {
    return {
      aplicadoPorTipo: dto.aplicadoPorTipo,
      aplicadoPorUsuarioId:
        dto.aplicadoPorTipo === AplicadoPorTipo.USUARIO
          ? (dto.aplicadoPorUsuarioId ?? null)
          : null,
      aplicadoPorVeterinarioId:
        dto.aplicadoPorTipo === AplicadoPorTipo.VETERINARIO
          ? (dto.aplicadoPorVeterinarioId ?? null)
          : null,
    };
  }

  // Raças padrão (sem fazenda) ou da própria fazenda
  private async validarRaca(fazendaId: string, racaId: string) {
    const raca = await this.racaRepository.findOne({
      where: [
        { id: racaId, fazendaId: IsNull() },
        { id: racaId, fazendaId },
      ],
    });
    if (!raca) throw new NotFoundException('Raça não encontrada');
  }

  private async buscarSemen(fazendaId: string, id: string) {
    const semen = await this.semenRepository.findOne({
      where: { id },
      relations: { raca: true },
    });
    if (!semen || semen.fazendaId !== fazendaId) {
      throw new NotFoundException('Sêmen não encontrado');
    }
    return semen;
  }

  private async buscarInseminacao(fazendaId: string, id: string) {
    const inseminacao = await this.inseminacaoRepository.findOne({
      where: { id },
      relations: { femea: true },
    });
    if (!inseminacao || inseminacao.femea?.fazendaId !== fazendaId) {
      throw new NotFoundException('Inseminação não encontrada');
    }
    return inseminacao;
  }
}
