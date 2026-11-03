import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, IsNull, Repository } from 'typeorm';
import { Animal, StatusAnimal } from '../animal/entities/animal.entity';
import { Pasto } from '../pasto/entities/pasto.entity';
import {
  AplicadoPorTipo,
  Tratamento,
} from '../tratamento/entities/tratamento.entity';
import { MovimentacaoPasto } from '../movimentacao-pasto/entities/movimentacao-pasto.entity';
import { TratamentoService } from '../tratamento/tratamento.service';
import { hojeLocal } from '../common/datas';
import {
  SessaoManejo,
  TipoSessaoManejo,
} from './entities/sessao-manejo.entity';
import { SessaoManejoExcecao } from './entities/sessao-manejo-excecao.entity';
import {
  FiltroGrupoDto,
  PastoEmLoteDto,
  TratamentoEmLoteDto,
} from './dto/manejo-lote.dto';

// Manejo em lote (M4): escolhe-se um grupo (pasto e/ou categoria), todos vêm
// marcados, desmarca-se as exceções com motivo e a ação é aplicada de uma vez.
// Cada animal tratado ou movido ganha o seu próprio registro, ligado à sessão.
@Injectable()
export class ManejoLoteService {
  constructor(
    @InjectRepository(Animal)
    private readonly animalRepository: Repository<Animal>,
    @InjectRepository(Pasto)
    private readonly pastoRepository: Repository<Pasto>,
    @InjectRepository(SessaoManejo)
    private readonly sessaoRepository: Repository<SessaoManejo>,
    private readonly tratamentoService: TratamentoService,
  ) {}

  async listarGrupo(fazendaId: string, filtro: FiltroGrupoDto) {
    const animais = await this.buscarGrupo(fazendaId, filtro);
    return animais.map((animal) => ({
      id: animal.id,
      brinco: animal.brinco,
      sexo: animal.sexo,
      categoria: animal.categoria,
      pastoAtualId: animal.pastoAtualId,
    }));
  }

  async tratamentoEmLote(
    fazendaId: string,
    usuarioLogadoId: string,
    dto: TratamentoEmLoteDto,
  ) {
    await this.validarSelecao(fazendaId, dto);
    await this.tratamentoService.validarAplicador(
      fazendaId,
      dto.aplicadoPorTipo,
      dto.aplicadoPorUsuarioId,
      dto.aplicadoPorVeterinarioId,
    );
    const proximaDataPrevista = this.tratamentoService.calcularProximaData(
      dto.data,
      dto.recorrenciaDias,
    );

    return this.animalRepository.manager.transaction(async (manager) => {
      const sessao = await this.criarSessao(
        manager,
        fazendaId,
        usuarioLogadoId,
        dto,
        {
          tipo: TipoSessaoManejo.TRATAMENTO,
          data: dto.data,
          produto: dto.produto,
          pastoDestinoId: null,
        },
      );

      await manager.insert(
        Tratamento,
        dto.animalIds.map((animalId) => ({
          animalId,
          produto: dto.produto,
          data: dto.data,
          recorrenciaDias: dto.recorrenciaDias ?? null,
          proximaDataPrevista,
          aplicadoPorTipo: dto.aplicadoPorTipo,
          aplicadoPorUsuarioId:
            dto.aplicadoPorTipo === AplicadoPorTipo.USUARIO
              ? dto.aplicadoPorUsuarioId!
              : null,
          aplicadoPorVeterinarioId:
            dto.aplicadoPorTipo === AplicadoPorTipo.VETERINARIO
              ? dto.aplicadoPorVeterinarioId!
              : null,
          lancadoPorId: usuarioLogadoId,
          sessaoManejoId: sessao.id,
        })),
      );

      return {
        sessaoId: sessao.id,
        aplicados: dto.animalIds.length,
        excecoes: dto.excecoes.length,
      };
    });
  }

  async pastoEmLote(
    fazendaId: string,
    usuarioLogadoId: string,
    dto: PastoEmLoteDto,
  ) {
    if (dto.pastoId && dto.pastoId === dto.pastoDestinoId) {
      throw new BadRequestException(
        'O pasto de destino é o mesmo de onde o grupo está',
      );
    }
    const animais = await this.validarSelecao(fazendaId, dto);
    await this.garantirPasto(fazendaId, dto.pastoDestinoId);
    const data = dto.data ?? hojeLocal();

    // Quem já está no destino não ganha movimentação nova
    const aMover = animais.filter(
      (animal) =>
        dto.animalIds.includes(animal.id) &&
        animal.pastoAtualId !== dto.pastoDestinoId,
    );
    const idsAMover = aMover.map((animal) => animal.id);

    return this.animalRepository.manager.transaction(async (manager) => {
      const sessao = await this.criarSessao(
        manager,
        fazendaId,
        usuarioLogadoId,
        dto,
        {
          tipo: TipoSessaoManejo.PASTO,
          data,
          produto: null,
          pastoDestinoId: dto.pastoDestinoId,
        },
      );

      if (idsAMover.length > 0) {
        await manager.update(
          MovimentacaoPasto,
          { animalId: In(idsAMover), dataSaida: IsNull() },
          { dataSaida: data },
        );
        await manager.insert(
          MovimentacaoPasto,
          idsAMover.map((animalId) => ({
            animalId,
            pastoId: dto.pastoDestinoId,
            dataEntrada: data,
            dataSaida: null,
            criadoPorId: usuarioLogadoId,
            sessaoManejoId: sessao.id,
          })),
        );
        await manager.update(
          Animal,
          { id: In(idsAMover) },
          {
            pastoAtualId: dto.pastoDestinoId,
            atualizadoPorId: usuarioLogadoId,
          },
        );
      }

      return {
        sessaoId: sessao.id,
        movidos: idsAMover.length,
        jaEstavamNoDestino: dto.animalIds.length - idsAMover.length,
        excecoes: dto.excecoes.length,
      };
    });
  }

  async listarSessoes(fazendaId: string) {
    const sessoes = await this.sessaoRepository.find({
      where: { fazendaId },
      relations: {
        filtroPasto: true,
        pastoDestino: true,
        criadoPor: true,
        excecoes: { animal: true },
      },
      order: { criadoEm: 'DESC' },
      take: 20,
    });

    return sessoes.map((sessao) => ({
      id: sessao.id,
      tipo: sessao.tipo,
      data: sessao.data,
      produto: sessao.produto,
      filtroPasto: sessao.filtroPasto?.nome ?? null,
      filtroCategoria: sessao.filtroCategoria,
      pastoDestino: sessao.pastoDestino?.nome ?? null,
      totalAnimais: sessao.totalAnimais,
      criadoPor: sessao.criadoPor?.nome ?? null,
      criadoEm: sessao.criadoEm,
      excecoes: sessao.excecoes.map((excecao) => ({
        brinco: excecao.animal.brinco,
        motivo: excecao.motivo,
      })),
    }));
  }

  // Confere que marcados + exceções formam exatamente o grupo atual. Se alguém
  // entrou ou saiu do grupo depois que a lista foi carregada, pede para recarregar
  // em vez de aplicar a ação num conjunto diferente do que a pessoa conferiu.
  private async validarSelecao(
    fazendaId: string,
    dto: FiltroGrupoDto & {
      animalIds: string[];
      excecoes: { animalId: string }[];
    },
  ) {
    const grupo = await this.buscarGrupo(fazendaId, dto);
    const idsGrupo = new Set(grupo.map((animal) => animal.id));
    const marcados = new Set(dto.animalIds);
    const deFora = new Set(dto.excecoes.map((excecao) => excecao.animalId));

    if (marcados.size === 0) {
      throw new BadRequestException('Marque ao menos um animal');
    }
    if (
      marcados.size !== dto.animalIds.length ||
      deFora.size !== dto.excecoes.length
    ) {
      throw new BadRequestException('Há animais repetidos na seleção');
    }
    if ([...marcados].some((id) => deFora.has(id))) {
      throw new BadRequestException(
        'Um animal não pode estar marcado e nas exceções ao mesmo tempo',
      );
    }
    const selecionados = [...marcados, ...deFora];
    const mesmoGrupo =
      selecionados.length === idsGrupo.size &&
      selecionados.every((id) => idsGrupo.has(id));
    if (!mesmoGrupo) {
      throw new BadRequestException(
        'O grupo mudou desde que a lista foi carregada. Carregue os animais de novo.',
      );
    }
    return grupo;
  }

  private async buscarGrupo(fazendaId: string, filtro: FiltroGrupoDto) {
    if (!filtro.pastoId && !filtro.categoria) {
      throw new BadRequestException(
        'Escolha um pasto, uma categoria ou os dois',
      );
    }
    if (filtro.pastoId) {
      await this.garantirPasto(fazendaId, filtro.pastoId);
    }
    const animais = await this.animalRepository.find({
      where: {
        fazendaId,
        status: StatusAnimal.ATIVO,
        ...(filtro.pastoId && { pastoAtualId: filtro.pastoId }),
        ...(filtro.categoria && { categoria: filtro.categoria }),
      },
    });
    // Brinco é texto: ordena pelo número para "2" vir antes de "10"
    return animais.sort((a, b) =>
      a.brinco.localeCompare(b.brinco, 'pt-BR', { numeric: true }),
    );
  }

  private async garantirPasto(fazendaId: string, pastoId: string) {
    const pasto = await this.pastoRepository.findOneBy({ id: pastoId });
    if (!pasto || pasto.fazendaId !== fazendaId) {
      throw new NotFoundException('Pasto não encontrado');
    }
  }

  private async criarSessao(
    manager: EntityManager,
    fazendaId: string,
    usuarioLogadoId: string,
    dto: FiltroGrupoDto & {
      animalIds: string[];
      excecoes: { animalId: string; motivo: string }[];
    },
    dados: Pick<SessaoManejo, 'tipo' | 'data' | 'produto' | 'pastoDestinoId'>,
  ) {
    const sessao = await manager.save(
      manager.create(SessaoManejo, {
        fazendaId,
        ...dados,
        filtroPastoId: dto.pastoId ?? null,
        filtroCategoria: dto.categoria ?? null,
        totalAnimais: dto.animalIds.length,
        criadoPorId: usuarioLogadoId,
      }),
    );
    if (dto.excecoes.length > 0) {
      await manager.insert(
        SessaoManejoExcecao,
        dto.excecoes.map((excecao) => ({
          sessaoId: sessao.id,
          animalId: excecao.animalId,
          motivo: excecao.motivo.trim(),
        })),
      );
    }
    return sessao;
  }
}
