import { ganchosRebanho } from '../common/ganchos-rebanho';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Parto, ResultadoParto } from './entities/parto.entity';
import {
  Animal,
  CategoriaAnimal,
  OrigemAnimal,
  Sexo,
} from '../animal/entities/animal.entity';
import {
  CodigoIdentificacao,
  StatusCodigo,
} from '../codigo-identificacao/entities/codigo-identificacao.entity';
import { MovimentacaoPasto } from '../movimentacao-pasto/entities/movimentacao-pasto.entity';
import { Pasto } from '../pasto/entities/pasto.entity';
import { CreateCriaDto, CreatePartoDto } from './dto/create-parto.dto';
import { UpdatePartoDto } from './dto/update-parto.dto';
import {
  garantirAnimalAtivo,
  garantirRacaDisponivel,
  reservarCodigo,
} from '../common/vinculos';
import { buscarCandidatosPai } from '../reproducao/candidatos';
import { recalcularStatusReprodutivo } from '../reproducao/status';
import { PartoCandidatoPai } from '../reproducao/entities/parto-candidato-pai.entity';

@Injectable()
export class PartoService {
  constructor(
    @InjectRepository(Parto)
    private readonly partoRepository: Repository<Parto>,
    @InjectRepository(Animal)
    private readonly animalRepository: Repository<Animal>,
    @InjectRepository(CodigoIdentificacao)
    private readonly codigoRepository: Repository<CodigoIdentificacao>,
    @InjectRepository(Pasto)
    private readonly pastoRepository: Repository<Pasto>,
  ) {}

  async create(
    fazendaId: string,
    usuarioLogadoId: string,
    dto: CreatePartoDto,
  ) {
    const mae = await this.animalRepository.findOneBy({ id: dto.maeId });
    if (!mae || mae.fazendaId !== fazendaId) {
      throw new NotFoundException('Matriz (mãe) não encontrada');
    }
    garantirAnimalAtivo(mae);
    // Novilha também pare; no primeiro parto ela passa a Matriz (FR-031)
    if (
      mae.categoria !== CategoriaAnimal.MATRIZ &&
      mae.categoria !== CategoriaAnimal.NOVILHA
    ) {
      throw new BadRequestException(
        'Somente matrizes e novilhas podem ter partos registrados',
      );
    }

    if (dto.pastoId) {
      const pasto = await this.pastoRepository.findOneBy({ id: dto.pastoId });
      if (!pasto || pasto.fazendaId !== fazendaId) {
        throw new NotFoundException('Pasto não encontrado');
      }
    }

    const codigosPorCria = new Map<string, CodigoIdentificacao>();
    if (dto.resultado === ResultadoParto.VIVO) {
      const idsInformados = (dto.crias ?? []).map((cria) => cria.codigoId);
      const idsRepetidos = idsInformados.filter(
        (id, indice) => idsInformados.indexOf(id) !== indice,
      );
      if (idsRepetidos.length > 0) {
        throw new BadRequestException(
          'O mesmo código não pode ser usado em duas crias do mesmo parto',
        );
      }

      for (const cria of dto.crias ?? []) {
        const codigo = await this.codigoRepository.findOneBy({
          id: cria.codigoId,
        });
        if (!codigo || codigo.fazendaId !== fazendaId) {
          throw new NotFoundException('Código não encontrado');
        }
        if (codigo.status !== StatusCodigo.DISPONIVEL) {
          throw new ConflictException(
            'Um dos códigos informados já está vinculado ou foi desativado',
          );
        }
        if (cria.racaId) {
          await garantirRacaDisponivel(
            this.partoRepository.manager,
            fazendaId,
            cria.racaId,
          );
        }
        codigosPorCria.set(cria.codigoId, codigo);
      }
    }

    return this.partoRepository.manager.transaction(async (manager) => {
      // Pai da cria pela cobertura registrada (research R6): só preenche quando
      // há um único candidato; com mais de um, o dono escolhe depois
      const candidatos = await buscarCandidatosPai(manager, mae, dto.data);
      const totalCandidatos =
        candidatos.touroIds.length + candidatos.semenIds.length;
      const paiId =
        totalCandidatos === 1 ? (candidatos.touroIds[0] ?? null) : null;
      const paiSemenId =
        totalCandidatos === 1 ? (candidatos.semenIds[0] ?? null) : null;

      const parto = manager.create(Parto, {
        inseminacaoId: candidatos.inseminacaoId,
        maeId: dto.maeId,
        data: dto.data,
        tipo: dto.tipo,
        resultado: dto.resultado,
        observacoes: dto.observacoes ?? null,
        criadoPorId: usuarioLogadoId,
      });
      const partoSalvo = await manager.save(parto);

      if (dto.resultado === ResultadoParto.VIVO) {
        for (const cria of dto.crias ?? []) {
          const codigo = codigosPorCria.get(cria.codigoId)!;

          const animal = manager.create(Animal, {
            fazendaId: mae.fazendaId,
            brinco: String(codigo.numero),
            sexo: cria.sexo,
            categoria:
              cria.sexo === Sexo.F
                ? CategoriaAnimal.NOVILHA
                : CategoriaAnimal.BEZERRO,
            origem: OrigemAnimal.NASCIDO_FAZENDA,
            dataNascimento: dto.data,
            racaId: cria.racaId ?? mae.racaId,
            maeId: mae.id,
            paiId,
            paiSemenId,
            partoId: partoSalvo.id,
            pastoAtualId: dto.pastoId ?? null,
            criadoPorId: usuarioLogadoId,
          });
          const animalSalvo = await manager.save(animal);

          await reservarCodigo(manager, codigo.id, animalSalvo.id);

          if (dto.pastoId) {
            const movimentacao = manager.create(MovimentacaoPasto, {
              animalId: animalSalvo.id,
              pastoId: dto.pastoId,
              dataEntrada: dto.data,
              dataSaida: null,
              criadoPorId: usuarioLogadoId,
            });
            await manager.save(movimentacao);
          }
        }
      }

      if (totalCandidatos > 0) {
        await manager.insert(PartoCandidatoPai, [
          ...candidatos.touroIds.map((touroId) => ({
            partoId: partoSalvo.id,
            touroId,
            semenId: null,
          })),
          ...candidatos.semenIds.map((semenId) => ({
            partoId: partoSalvo.id,
            touroId: null,
            semenId,
          })),
        ]);
      }

      if (mae.categoria === CategoriaAnimal.NOVILHA) {
        await manager.update(
          Animal,
          { id: mae.id },
          {
            categoria: CategoriaAnimal.MATRIZ,
            atualizadoPorId: usuarioLogadoId,
          },
        );
      }
      // Lactante com cria viva, Vazia em natimorto (FR-022)
      await recalcularStatusReprodutivo(manager, mae.id, usuarioLogadoId);
      // Módulos pagos reagem ao parto (ex.: Leite abre a lactação, spec 004)
      await ganchosRebanho.emitir('partoRegistrado', manager, {
        fazendaId: mae.fazendaId,
        maeId: mae.id,
        partoId: partoSalvo.id,
        data: dto.data,
        usuarioId: usuarioLogadoId,
      });

      return manager.findOne(Parto, {
        where: { id: partoSalvo.id },
        relations: { crias: true, candidatos: { touro: true, semen: true } },
      });
    });
  }

  // Só o dono: escolhe o pai entre os candidatos gravados no parto (FR-021)
  async definirPai(
    fazendaId: string,
    usuarioLogadoId: string,
    id: string,
    pai: { touroId?: string; semenId?: string },
  ) {
    if (!pai.touroId === !pai.semenId) {
      throw new BadRequestException('Informe o touro ou o sêmen, um dos dois');
    }
    const parto = await this.partoRepository.findOne({
      where: { id },
      relations: { mae: true, candidatos: true, crias: true },
    });
    if (!parto || parto.mae.fazendaId !== fazendaId) {
      throw new NotFoundException(`Parto ${id} não encontrado`);
    }
    const ehCandidato = (parto.candidatos ?? []).some(
      (candidato) =>
        (pai.touroId && candidato.touroId === pai.touroId) ||
        (pai.semenId && candidato.semenId === pai.semenId),
    );
    if (!ehCandidato) {
      throw new BadRequestException(
        'O pai precisa ser um dos candidatos deste parto',
      );
    }
    const criaIds = (parto.crias ?? []).map((cria) => cria.id);
    if (criaIds.length > 0) {
      await this.animalRepository.update(
        { id: In(criaIds) },
        {
          paiId: pai.touroId ?? null,
          paiSemenId: pai.semenId ?? null,
          atualizadoPorId: usuarioLogadoId,
        },
      );
    }
    return this.findOne(fazendaId, id);
  }

  findAll(fazendaId: string, maeId?: string) {
    const where = maeId
      ? { maeId, mae: { fazendaId } }
      : { mae: { fazendaId } };
    return this.partoRepository.find({
      where,
      relations: { crias: true, candidatos: { touro: true, semen: true } },
      order: { data: 'DESC' },
    });
  }

  async findOne(fazendaId: string, id: string) {
    const parto = await this.partoRepository.findOne({
      where: { id },
      relations: {
        crias: true,
        mae: true,
        candidatos: { touro: true, semen: true },
      },
    });
    if (!parto || parto.mae.fazendaId !== fazendaId) {
      throw new NotFoundException(`Parto ${id} não encontrado`);
    }
    return parto;
  }

  async update(
    fazendaId: string,
    usuarioLogadoId: string,
    id: string,
    dto: UpdatePartoDto,
  ) {
    const parto = await this.findOne(fazendaId, id);
    const dataAnterior = parto.data;
    Object.assign(parto, dto);
    parto.atualizadoPorId = usuarioLogadoId;
    return this.partoRepository.manager.transaction(async (manager) => {
      const salvo = await manager.save(parto);
      if (dto.data && dto.data !== dataAnterior) {
        await ganchosRebanho.emitir('partoAlterado', manager, {
          fazendaId,
          maeId: parto.maeId,
          partoId: parto.id,
          dataAnterior,
          dataNova: dto.data,
          usuarioId: usuarioLogadoId,
        });
      }
      return salvo;
    });
  }
}
