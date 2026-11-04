import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import {
  Animal,
  Sexo,
  StatusAnimal,
  StatusReprodutivo,
} from '../animal/entities/animal.entity';
import { Parto, ResultadoParto } from '../parto/entities/parto.entity';
import { AplicadoPorTipo } from '../tratamento/entities/tratamento.entity';
import { TratamentoService } from '../tratamento/tratamento.service';
import {
  DiagnosticoGestacao,
  ResultadoDiagnostico,
} from './entities/diagnostico-gestacao.entity';
import { SituacaoService } from './situacao.service';
import {
  DiagnosticoDto,
  DiagnosticoLoteDto,
  EditarDiagnosticoDto,
  PerdaDto,
} from './dto/diagnostico.dto';

// Diagnóstico de gestação e perda (US2). Cada evento atualiza o status
// reprodutivo da fêmea na mesma transação (research R3).
@Injectable()
export class DiagnosticoService {
  constructor(
    @InjectRepository(DiagnosticoGestacao)
    private readonly diagnosticoRepository: Repository<DiagnosticoGestacao>,
    @InjectRepository(Animal)
    private readonly animalRepository: Repository<Animal>,
    private readonly situacaoService: SituacaoService,
    private readonly tratamentoService: TratamentoService,
  ) {}

  async registrar(fazendaId: string, usuarioId: string, dto: DiagnosticoDto) {
    const femea = await this.buscarFemea(fazendaId, dto.femeaId);
    this.validarIdade(dto.resultado, dto.idadeGestacionalDias);
    await this.tratamentoService.validarAplicador(
      fazendaId,
      dto.feitoPorTipo,
      dto.feitoPorUsuarioId,
      dto.feitoPorVeterinarioId,
    );

    return this.diagnosticoRepository.manager.transaction(async (manager) => {
      const diagnostico = await manager.save(
        manager.create(DiagnosticoGestacao, {
          ...this.dadosQuemFez(dto),
          femeaId: femea.id,
          data: dto.data,
          resultado: dto.resultado,
          metodo: dto.metodo,
          idadeGestacionalDias: dto.idadeGestacionalDias ?? null,
          motivo: null,
          sessaoId: null,
          criadoPorId: usuarioId,
        }),
      );
      await this.recalcularStatus(manager, femea.id, usuarioId);
      return diagnostico;
    });
  }

  // Diagnóstico de um grupo inteiro: um registro por fêmea (FR-014)
  async registrarLote(
    fazendaId: string,
    usuarioId: string,
    dto: DiagnosticoLoteDto,
  ) {
    if (!dto.pastoId && !dto.categoria) {
      throw new BadRequestException(
        'Escolha um pasto, uma categoria ou os dois',
      );
    }
    const grupo = await this.situacaoService.buscarFemeas(fazendaId, {
      pastoId: dto.pastoId,
      categoria: dto.categoria,
    });
    const idsGrupo = new Set(grupo.map((femea) => femea.id));
    const ids = dto.resultados.map((resultado) => resultado.femeaId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Há fêmeas repetidas na lista');
    }
    if (ids.some((id) => !idsGrupo.has(id))) {
      throw new BadRequestException(
        'A lista de fêmeas do grupo mudou desde que foi carregada. Carregue de novo.',
      );
    }
    for (const resultado of dto.resultados) {
      this.validarIdade(resultado.resultado, resultado.idadeGestacionalDias);
    }
    await this.tratamentoService.validarAplicador(
      fazendaId,
      dto.feitoPorTipo,
      dto.feitoPorUsuarioId,
      dto.feitoPorVeterinarioId,
    );

    const sessaoId = randomUUID();
    await this.diagnosticoRepository.manager.transaction(async (manager) => {
      await manager.insert(
        DiagnosticoGestacao,
        dto.resultados.map((resultado) => ({
          ...this.dadosQuemFez(dto),
          femeaId: resultado.femeaId,
          data: dto.data,
          resultado: resultado.resultado,
          metodo: dto.metodo,
          idadeGestacionalDias: resultado.idadeGestacionalDias ?? null,
          motivo: null,
          sessaoId,
          criadoPorId: usuarioId,
        })),
      );
      for (const id of ids) {
        await this.recalcularStatus(manager, id, usuarioId);
      }
    });

    const prenhes = dto.resultados.filter(
      (r) => r.resultado === ResultadoDiagnostico.PRENHE,
    ).length;
    return { prenhes, vazias: dto.resultados.length - prenhes };
  }

  // Perda de gestação de uma fêmea prenhe (FR-016)
  async registrarPerda(fazendaId: string, usuarioId: string, dto: PerdaDto) {
    const femea = await this.buscarFemea(fazendaId, dto.femeaId);
    if (femea.statusReprodutivo !== StatusReprodutivo.PRENHE) {
      throw new BadRequestException(
        'Só é possível registrar perda de uma fêmea prenhe',
      );
    }
    return this.diagnosticoRepository.manager.transaction(async (manager) => {
      const perda = await manager.save(
        manager.create(DiagnosticoGestacao, {
          femeaId: femea.id,
          data: dto.data,
          resultado: ResultadoDiagnostico.PERDA,
          metodo: null,
          idadeGestacionalDias: null,
          motivo: dto.motivo.trim(),
          feitoPorTipo: AplicadoPorTipo.USUARIO,
          feitoPorUsuarioId: usuarioId,
          feitoPorVeterinarioId: null,
          sessaoId: null,
          criadoPorId: usuarioId,
        }),
      );
      await this.recalcularStatus(manager, femea.id, usuarioId);
      return perda;
    });
  }

  // Só o dono (FR-026)
  async editar(
    fazendaId: string,
    usuarioId: string,
    id: string,
    dto: EditarDiagnosticoDto,
  ) {
    const diagnostico = await this.buscarDiagnostico(fazendaId, id);
    if (diagnostico.cancelamento.cancelado) {
      throw new BadRequestException(
        'Diagnóstico cancelado não pode ser editado',
      );
    }
    if (diagnostico.resultado === ResultadoDiagnostico.PERDA && dto.resultado) {
      throw new BadRequestException(
        'Uma perda de gestação não vira diagnóstico; cancele e registre de novo',
      );
    }
    const resultado = dto.resultado ?? diagnostico.resultado;
    const idade =
      dto.idadeGestacionalDias !== undefined
        ? dto.idadeGestacionalDias
        : diagnostico.idadeGestacionalDias;
    // Mudar para vazia apaga a idade gestacional que só faz sentido em prenhe
    const idadeFinal = resultado === ResultadoDiagnostico.PRENHE ? idade : null;
    this.validarIdade(resultado, idadeFinal ?? undefined);

    return this.diagnosticoRepository.manager.transaction(async (manager) => {
      await manager.update(
        DiagnosticoGestacao,
        { id },
        {
          data: dto.data ?? diagnostico.data,
          resultado,
          metodo: dto.metodo ?? diagnostico.metodo,
          idadeGestacionalDias: idadeFinal,
          atualizadoPorId: usuarioId,
        },
      );
      await this.recalcularStatus(manager, diagnostico.femeaId, usuarioId);
      return manager.findOneBy(DiagnosticoGestacao, { id });
    });
  }

  // Só o dono: fica no histórico, fora dos cálculos; o status volta ao evento anterior
  async cancelar(
    fazendaId: string,
    usuarioId: string,
    id: string,
    motivo: string,
  ) {
    const diagnostico = await this.buscarDiagnostico(fazendaId, id);
    if (diagnostico.cancelamento.cancelado) {
      throw new BadRequestException('Este registro já foi cancelado');
    }
    await this.diagnosticoRepository.manager.transaction(async (manager) => {
      await manager.update(
        DiagnosticoGestacao,
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
      await this.recalcularStatus(manager, diagnostico.femeaId, usuarioId);
    });
    return { cancelado: true };
  }

  // Fêmeas ativas do grupo com a situação atual, para a tela de diagnóstico em lote
  async listarGrupo(
    fazendaId: string,
    filtro: { pastoId?: string; categoria?: Animal['categoria'] },
  ) {
    if (!filtro.pastoId && !filtro.categoria) {
      throw new BadRequestException(
        'Escolha um pasto, uma categoria ou os dois',
      );
    }
    const femeas = await this.situacaoService.buscarFemeas(fazendaId, filtro);
    const ultimos = await this.ultimosDiagnosticos(
      femeas.map((femea) => femea.id),
    );
    return femeas.map((femea) => ({
      id: femea.id,
      brinco: femea.brinco,
      categoria: femea.categoria,
      statusReprodutivo: femea.statusReprodutivo,
      ultimoDiagnostico: ultimos.get(femea.id) ?? null,
    }));
  }

  // O status reprodutivo vem do evento válido mais recente entre diagnósticos e
  // partos (research R3). No mesmo dia, o parto prevalece.
  async recalcularStatus(
    manager: EntityManager,
    femeaId: string,
    usuarioId: string,
  ) {
    const ultimoDiagnostico = await manager.findOne(DiagnosticoGestacao, {
      where: { femeaId, cancelamento: { cancelado: false } },
      order: { data: 'DESC', criadoEm: 'DESC' },
    });
    const ultimoParto = await manager.findOne(Parto, {
      where: { maeId: femeaId },
      order: { data: 'DESC', criadoEm: 'DESC' },
    });

    let status: StatusReprodutivo | null = null;
    if (
      ultimoParto &&
      (!ultimoDiagnostico || ultimoParto.data >= ultimoDiagnostico.data)
    ) {
      status =
        ultimoParto.resultado === ResultadoParto.VIVO
          ? StatusReprodutivo.LACTANTE
          : StatusReprodutivo.VAZIA;
    } else if (ultimoDiagnostico) {
      status =
        ultimoDiagnostico.resultado === ResultadoDiagnostico.PRENHE
          ? StatusReprodutivo.PRENHE
          : StatusReprodutivo.VAZIA;
    }
    await manager.update(
      Animal,
      { id: femeaId },
      { statusReprodutivo: status, atualizadoPorId: usuarioId },
    );
    return status;
  }

  private async ultimosDiagnosticos(femeaIds: string[]) {
    const mapa = new Map<
      string,
      { data: string; resultado: ResultadoDiagnostico }
    >();
    if (femeaIds.length === 0) return mapa;
    const diagnosticos = await this.diagnosticoRepository.find({
      where: { femeaId: In(femeaIds), cancelamento: { cancelado: false } },
      order: { data: 'DESC', criadoEm: 'DESC' },
    });
    for (const diagnostico of diagnosticos) {
      if (!mapa.has(diagnostico.femeaId)) {
        mapa.set(diagnostico.femeaId, {
          data: diagnostico.data,
          resultado: diagnostico.resultado,
        });
      }
    }
    return mapa;
  }

  private validarIdade(resultado: ResultadoDiagnostico, idade?: number | null) {
    if (idade && resultado !== ResultadoDiagnostico.PRENHE) {
      throw new BadRequestException(
        'Idade gestacional só se informa em fêmea prenhe',
      );
    }
  }

  private dadosQuemFez(dto: {
    feitoPorTipo: AplicadoPorTipo;
    feitoPorUsuarioId?: string;
    feitoPorVeterinarioId?: string;
  }) {
    return {
      feitoPorTipo: dto.feitoPorTipo,
      feitoPorUsuarioId:
        dto.feitoPorTipo === AplicadoPorTipo.USUARIO
          ? (dto.feitoPorUsuarioId ?? null)
          : null,
      feitoPorVeterinarioId:
        dto.feitoPorTipo === AplicadoPorTipo.VETERINARIO
          ? (dto.feitoPorVeterinarioId ?? null)
          : null,
    };
  }

  // Diagnóstico só em fêmea ativa da fazenda (FR-017)
  private async buscarFemea(fazendaId: string, femeaId: string) {
    const femea = await this.animalRepository.findOneBy({ id: femeaId });
    if (!femea || femea.fazendaId !== fazendaId) {
      throw new NotFoundException('Animal não encontrado');
    }
    if (femea.sexo !== Sexo.F) {
      throw new BadRequestException('Diagnóstico de gestação só em fêmea');
    }
    if (femea.status !== StatusAnimal.ATIVO) {
      throw new BadRequestException('Este animal não está mais no rebanho');
    }
    return femea;
  }

  private async buscarDiagnostico(fazendaId: string, id: string) {
    const diagnostico = await this.diagnosticoRepository.findOne({
      where: { id },
      relations: { femea: true },
    });
    if (!diagnostico || diagnostico.femea?.fazendaId !== fazendaId) {
      throw new NotFoundException('Diagnóstico não encontrado');
    }
    return diagnostico;
  }
}
