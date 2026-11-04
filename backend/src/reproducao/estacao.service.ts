import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import {
  Animal,
  CategoriaAnimal,
  Sexo,
  StatusAnimal,
} from '../animal/entities/animal.entity';
import { Pasto } from '../pasto/entities/pasto.entity';
import { MovimentacaoPasto } from '../movimentacao-pasto/entities/movimentacao-pasto.entity';
import {
  EstacaoMonta,
  MotivoEncerramento,
} from './entities/estacao-monta.entity';
import {
  ExposicaoMonta,
  MotivoFimExposicao,
} from './entities/exposicao-monta.entity';
import { ExcecaoEstacao } from './entities/excecao-estacao.entity';
import { SituacaoService } from './situacao.service';
import { fecharEstacao } from './saida';
import { formatarDataBr } from './dominio/datas';
import {
  AbrirEstacaoDto,
  EditarEstacaoDto,
  EncerrarEstacaoDto,
  IncluirFemeasDto,
} from './dto/estacao.dto';

// Estações de monta natural (US1): um touro num pasto por um período
@Injectable()
export class EstacaoService {
  constructor(
    @InjectRepository(EstacaoMonta)
    private readonly estacaoRepository: Repository<EstacaoMonta>,
    @InjectRepository(ExposicaoMonta)
    private readonly exposicaoRepository: Repository<ExposicaoMonta>,
    @InjectRepository(Animal)
    private readonly animalRepository: Repository<Animal>,
    @InjectRepository(Pasto)
    private readonly pastoRepository: Repository<Pasto>,
    private readonly situacaoService: SituacaoService,
  ) {}

  async abrir(fazendaId: string, usuarioId: string, dto: AbrirEstacaoDto) {
    const touro = await this.garantirTouro(fazendaId, dto.touroId);
    await this.garantirPasto(fazendaId, dto.pastoId);
    await this.garantirTouroLivre(dto.touroId);

    // Marcadas + exceções têm de ser exatamente as aptas do pasto na data:
    // se alguém entrou ou saiu do pasto depois de carregar a lista, pede para recarregar
    const aptas = await this.situacaoService.listarAptas(
      fazendaId,
      { pastoId: dto.pastoId },
      dto.dataEntrada,
    );
    this.validarSelecao(
      aptas.map((femea) => femea.id),
      dto.femeaIds,
      dto.excecoes.map((excecao) => excecao.femeaId),
    );

    return this.estacaoRepository.manager.transaction(async (manager) => {
      const estacao = await manager.save(
        manager.create(EstacaoMonta, {
          fazendaId,
          touroId: dto.touroId,
          pastoId: dto.pastoId,
          dataEntrada: dto.dataEntrada,
          dataSaida: null,
          motivoEncerramento: null,
          criadoPorId: usuarioId,
        }),
      );
      await manager.insert(
        ExposicaoMonta,
        dto.femeaIds.map((femeaId) => ({
          estacaoId: estacao.id,
          femeaId,
          dataInicio: dto.dataEntrada,
          criadoPorId: usuarioId,
        })),
      );
      // Abrir a estação é colocar o touro no pasto: se ele está em outro, é movido
      if (touro.pastoAtualId !== dto.pastoId) {
        await manager.update(
          MovimentacaoPasto,
          { animalId: touro.id, dataSaida: IsNull() },
          { dataSaida: dto.dataEntrada },
        );
        await manager.insert(MovimentacaoPasto, {
          animalId: touro.id,
          pastoId: dto.pastoId,
          dataEntrada: dto.dataEntrada,
          dataSaida: null,
          criadoPorId: usuarioId,
        });
        await manager.update(
          Animal,
          { id: touro.id },
          { pastoAtualId: dto.pastoId, atualizadoPorId: usuarioId },
        );
      }
      if (dto.excecoes.length > 0) {
        await manager.insert(
          ExcecaoEstacao,
          dto.excecoes.map((excecao) => ({
            estacaoId: estacao.id,
            femeaId: excecao.femeaId,
            motivo: excecao.motivo.trim(),
          })),
        );
      }
      return {
        id: estacao.id,
        expostas: dto.femeaIds.length,
        excecoes: dto.excecoes.length,
      };
    });
  }

  // Inclui fêmeas que chegaram ao pasto depois da abertura (FR-006)
  async incluirFemeas(
    fazendaId: string,
    usuarioId: string,
    id: string,
    dto: IncluirFemeasDto,
  ) {
    const estacao = await this.buscarAberta(fazendaId, id);
    if (dto.femeaIds.length === 0) {
      throw new BadRequestException('Escolha ao menos uma fêmea');
    }
    if (dto.dataInicio < estacao.dataEntrada) {
      throw new BadRequestException('A fêmea não pode entrar antes do touro');
    }

    const femeas = await this.animalRepository.findBy({ id: In(dto.femeaIds) });
    if (
      femeas.length !== new Set(dto.femeaIds).size ||
      femeas.some((f) => f.fazendaId !== fazendaId)
    ) {
      throw new NotFoundException('Fêmea não encontrada');
    }
    for (const femea of femeas) {
      const motivo = await this.situacaoService.motivoInaptidao(
        femea,
        dto.dataInicio,
      );
      if (motivo) {
        throw new BadRequestException(
          `O brinco ${femea.brinco} não pode entrar: ${motivo}`,
        );
      }
    }
    const jaExpostas = await this.exposicaoRepository.find({
      where: {
        estacaoId: id,
        femeaId: In(dto.femeaIds),
        cancelamento: { cancelado: false },
      },
    });
    if (jaExpostas.length > 0) {
      throw new BadRequestException('Uma das fêmeas já está nesta estação');
    }

    await this.exposicaoRepository.insert(
      dto.femeaIds.map((femeaId) => ({
        estacaoId: id,
        femeaId,
        dataInicio: dto.dataInicio,
        criadoPorId: usuarioId,
      })),
    );
    return { incluidas: dto.femeaIds.length };
  }

  async encerrar(
    fazendaId: string,
    usuarioId: string,
    id: string,
    dto: EncerrarEstacaoDto,
  ) {
    const estacao = await this.buscarAberta(fazendaId, id);
    if (dto.dataSaida < estacao.dataEntrada) {
      throw new BadRequestException(
        'A saída do touro não pode ser antes da entrada',
      );
    }
    await this.estacaoRepository.manager.transaction((manager) =>
      fecharEstacao(
        manager,
        estacao,
        dto.dataSaida,
        MotivoEncerramento.MANUAL,
        usuarioId,
      ),
    );
    return this.detalhar(fazendaId, id);
  }

  async listar(fazendaId: string, situacao?: 'ABERTA' | 'ENCERRADA') {
    const estacoes = await this.estacaoRepository.find({
      where: {
        fazendaId,
        cancelamento: { cancelado: false },
        ...(situacao === 'ABERTA' && { dataSaida: IsNull() }),
        ...(situacao === 'ENCERRADA' && { dataSaida: Not(IsNull()) }),
      },
      relations: { touro: true, pasto: true },
      order: { dataEntrada: 'DESC' },
    });
    const contagens = await this.contarExpostas(
      estacoes.map((estacao) => estacao.id),
    );
    return estacoes.map((estacao) => ({
      id: estacao.id,
      touro: { id: estacao.touroId, brinco: estacao.touro?.brinco },
      pasto: { id: estacao.pastoId, nome: estacao.pasto?.nome },
      dataEntrada: estacao.dataEntrada,
      dataSaida: estacao.dataSaida,
      motivoEncerramento: estacao.motivoEncerramento,
      expostas: contagens.get(estacao.id) ?? 0,
    }));
  }

  async detalhar(fazendaId: string, id: string) {
    const estacao = await this.estacaoRepository.findOne({
      where: { id },
      relations: {
        touro: true,
        pasto: true,
        criadoPor: true,
        exposicoes: { femea: true },
        excecoes: { femea: true },
      },
    });
    if (!estacao || estacao.fazendaId !== fazendaId) {
      throw new NotFoundException('Estação não encontrada');
    }
    const exposicoes = (estacao.exposicoes ?? []).sort((a, b) =>
      a.femea!.brinco.localeCompare(b.femea!.brinco, 'pt-BR', {
        numeric: true,
      }),
    );
    return {
      id: estacao.id,
      touro: { id: estacao.touroId, brinco: estacao.touro?.brinco },
      pasto: { id: estacao.pastoId, nome: estacao.pasto?.nome },
      dataEntrada: estacao.dataEntrada,
      dataSaida: estacao.dataSaida,
      motivoEncerramento: estacao.motivoEncerramento,
      cancelamento: estacao.cancelamento,
      criadoPor: estacao.criadoPor?.nome ?? null,
      exposicoes: exposicoes.map((exposicao) => ({
        id: exposicao.id,
        femea: {
          id: exposicao.femeaId,
          brinco: exposicao.femea?.brinco,
          categoria: exposicao.femea?.categoria,
        },
        dataInicio: exposicao.dataInicio,
        dataFim: exposicao.dataFim,
        motivoFim: exposicao.motivoFim,
        cancelamento: exposicao.cancelamento,
      })),
      excecoes: (estacao.excecoes ?? []).map((excecao) => ({
        femea: { id: excecao.femeaId, brinco: excecao.femea?.brinco },
        motivo: excecao.motivo,
      })),
    };
  }

  // Só o dono (FR-026): corrige as datas e leva junto as exposições que
  // começaram na entrada ou terminaram junto com a estação
  async editar(
    fazendaId: string,
    usuarioId: string,
    id: string,
    dto: EditarEstacaoDto,
  ) {
    const estacao = await this.buscar(fazendaId, id);
    if (estacao.cancelamento.cancelado) {
      throw new BadRequestException('Estação cancelada não pode ser editada');
    }
    const novaEntrada = dto.dataEntrada ?? estacao.dataEntrada;
    const novaSaida = dto.dataSaida ?? estacao.dataSaida;
    if (novaSaida && novaSaida < novaEntrada) {
      throw new BadRequestException(
        'A saída do touro não pode ser antes da entrada',
      );
    }
    if (dto.dataSaida && !estacao.dataSaida) {
      throw new BadRequestException('Para encerrar a estação, use "Encerrar"');
    }

    await this.estacaoRepository.manager.transaction(async (manager) => {
      if (novaEntrada !== estacao.dataEntrada) {
        await manager.update(
          ExposicaoMonta,
          { estacaoId: id, dataInicio: estacao.dataEntrada },
          { dataInicio: novaEntrada, atualizadoPorId: usuarioId },
        );
      }
      if (estacao.dataSaida && novaSaida !== estacao.dataSaida) {
        await manager.update(
          ExposicaoMonta,
          {
            estacaoId: id,
            dataFim: estacao.dataSaida,
            motivoFim: MotivoFimExposicao.ESTACAO_ENCERRADA,
          },
          { dataFim: novaSaida, atualizadoPorId: usuarioId },
        );
      }
      await manager.update(
        EstacaoMonta,
        { id },
        {
          dataEntrada: novaEntrada,
          dataSaida: novaSaida,
          atualizadoPorId: usuarioId,
        },
      );
    });
    return this.detalhar(fazendaId, id);
  }

  // Só o dono: a estação e as exposições ficam no histórico, fora dos cálculos
  async cancelar(
    fazendaId: string,
    usuarioId: string,
    id: string,
    motivo: string,
  ) {
    const estacao = await this.buscar(fazendaId, id);
    if (estacao.cancelamento.cancelado) {
      throw new BadRequestException('Esta estação já foi cancelada');
    }
    const cancelamento = this.dadosCancelamento(usuarioId, motivo);
    await this.estacaoRepository.manager.transaction(async (manager) => {
      await manager.update(EstacaoMonta, { id }, cancelamento);
      await manager.update(
        ExposicaoMonta,
        { estacaoId: id, cancelamento: { cancelado: false } },
        cancelamento,
      );
    });
    return { cancelada: true };
  }

  async cancelarExposicao(
    fazendaId: string,
    usuarioId: string,
    id: string,
    motivo: string,
  ) {
    const exposicao = await this.exposicaoRepository.findOne({
      where: { id },
      relations: { estacao: true },
    });
    if (!exposicao || exposicao.estacao?.fazendaId !== fazendaId) {
      throw new NotFoundException('Exposição não encontrada');
    }
    if (exposicao.cancelamento.cancelado) {
      throw new BadRequestException('Esta exposição já foi cancelada');
    }
    await this.exposicaoRepository.update(
      { id },
      this.dadosCancelamento(usuarioId, motivo),
    );
    return { cancelada: true };
  }

  private dadosCancelamento(usuarioId: string, motivo: string) {
    return {
      cancelamento: {
        cancelado: true,
        canceladoEm: new Date(),
        canceladoPorId: usuarioId,
        motivoCancelamento: motivo.trim(),
      },
      atualizadoPorId: usuarioId,
    };
  }

  private validarSelecao(
    aptas: string[],
    marcadas: string[],
    deFora: string[],
  ) {
    const idsAptas = new Set(aptas);
    const setMarcadas = new Set(marcadas);
    const setDeFora = new Set(deFora);
    if (setMarcadas.size === 0) {
      throw new BadRequestException('Marque ao menos uma fêmea');
    }
    if (
      setMarcadas.size !== marcadas.length ||
      setDeFora.size !== deFora.length
    ) {
      throw new BadRequestException('Há fêmeas repetidas na seleção');
    }
    if (marcadas.some((id) => setDeFora.has(id))) {
      throw new BadRequestException(
        'Uma fêmea não pode estar marcada e de fora ao mesmo tempo',
      );
    }
    const selecionadas = [...marcadas, ...deFora];
    if (
      selecionadas.length !== idsAptas.size ||
      !selecionadas.every((id) => idsAptas.has(id))
    ) {
      throw new BadRequestException(
        'A lista de fêmeas do pasto mudou desde que foi carregada. Carregue de novo.',
      );
    }
  }

  private async garantirTouro(fazendaId: string, touroId: string) {
    const touro = await this.animalRepository.findOneBy({ id: touroId });
    if (!touro || touro.fazendaId !== fazendaId) {
      throw new NotFoundException('Touro não encontrado');
    }
    if (
      touro.status !== StatusAnimal.ATIVO ||
      touro.sexo !== Sexo.M ||
      touro.categoria !== CategoriaAnimal.TOURO
    ) {
      throw new BadRequestException(
        'Escolha um touro ativo do rebanho (categoria Touro)',
      );
    }
    return touro;
  }

  private async garantirPasto(fazendaId: string, pastoId: string) {
    const pasto = await this.pastoRepository.findOneBy({ id: pastoId });
    if (!pasto || pasto.fazendaId !== fazendaId) {
      throw new NotFoundException('Pasto não encontrado');
    }
  }

  // Um touro não pode estar em duas estações abertas (FR-005)
  private async garantirTouroLivre(touroId: string) {
    const aberta = await this.estacaoRepository.findOne({
      where: {
        touroId,
        dataSaida: IsNull(),
        cancelamento: { cancelado: false },
      },
      relations: { pasto: true },
    });
    if (aberta) {
      throw new ConflictException(
        `Este touro já está numa estação aberta no ${aberta.pasto?.nome ?? 'pasto'}, desde ${formatarDataBr(aberta.dataEntrada)}`,
      );
    }
  }

  private async buscar(fazendaId: string, id: string) {
    const estacao = await this.estacaoRepository.findOneBy({ id });
    if (!estacao || estacao.fazendaId !== fazendaId) {
      throw new NotFoundException('Estação não encontrada');
    }
    return estacao;
  }

  private async buscarAberta(fazendaId: string, id: string) {
    const estacao = await this.buscar(fazendaId, id);
    if (estacao.cancelamento.cancelado || estacao.dataSaida) {
      throw new BadRequestException('Esta estação já foi encerrada');
    }
    return estacao;
  }

  private async contarExpostas(estacaoIds: string[]) {
    const mapa = new Map<string, number>();
    if (estacaoIds.length === 0) return mapa;
    const linhas = await this.exposicaoRepository
      .createQueryBuilder('exposicao')
      .select('exposicao.estacaoId', 'estacaoId')
      .addSelect('COUNT(*)', 'total')
      .where('exposicao.estacaoId IN (:...estacaoIds)', { estacaoIds })
      .andWhere('exposicao.cancelado = false')
      .groupBy('exposicao.estacaoId')
      .getRawMany<{ estacaoId: string; total: string }>();
    for (const linha of linhas) mapa.set(linha.estacaoId, Number(linha.total));
    return mapa;
  }
}
