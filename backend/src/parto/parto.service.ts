import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Parto, ResultadoParto } from './entities/parto.entity';
import { Animal, CategoriaAnimal, OrigemAnimal, Sexo } from '../animal/entities/animal.entity';
import {
  CodigoIdentificacao,
  StatusCodigo,
} from '../codigo-identificacao/entities/codigo-identificacao.entity';
import { MovimentacaoPasto } from '../movimentacao-pasto/entities/movimentacao-pasto.entity';
import { Pasto } from '../pasto/entities/pasto.entity';
import { CreateCriaDto, CreatePartoDto } from './dto/create-parto.dto';
import { UpdatePartoDto } from './dto/update-parto.dto';

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

  async create(fazendaId: string, usuarioLogadoId: string, dto: CreatePartoDto) {
    const mae = await this.animalRepository.findOneBy({ id: dto.maeId });
    if (!mae) {
      throw new NotFoundException('Matriz (mãe) não encontrada');
    }
    if (mae.fazendaId !== fazendaId) {
      throw new ForbiddenException('Esta matriz não pertence à sua fazenda');
    }
    if (mae.categoria !== CategoriaAnimal.MATRIZ) {
      throw new BadRequestException('Somente matrizes podem ter partos registrados');
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
        throw new BadRequestException('O mesmo código não pode ser usado em duas crias do mesmo parto');
      }

      for (const cria of dto.crias ?? []) {
        const codigo = await this.codigoRepository.findOneBy({ id: cria.codigoId });
        if (!codigo || codigo.fazendaId !== fazendaId) {
          throw new NotFoundException('Código não encontrado');
        }
        if (codigo.status !== StatusCodigo.DISPONIVEL) {
          throw new ConflictException('Um dos códigos informados já está vinculado ou foi desativado');
        }
        codigosPorCria.set(cria.codigoId, codigo);
      }
    }

    return this.partoRepository.manager.transaction(async (manager) => {
      const parto = manager.create(Parto, {
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
            categoria: cria.sexo === Sexo.F ? CategoriaAnimal.NOVILHA : CategoriaAnimal.BEZERRO,
            origem: OrigemAnimal.NASCIDO_FAZENDA,
            dataNascimento: dto.data,
            racaId: cria.racaId ?? mae.racaId,
            maeId: mae.id,
            partoId: partoSalvo.id,
            pastoAtualId: dto.pastoId ?? null,
            criadoPorId: usuarioLogadoId,
          });
          const animalSalvo = await manager.save(animal);

          codigo.status = StatusCodigo.VINCULADO;
          codigo.animalId = animalSalvo.id;
          codigo.vinculadoEm = new Date();
          await manager.save(codigo);

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

      return manager.findOne(Parto, {
        where: { id: partoSalvo.id },
        relations: { crias: true },
      });
    });
  }

  findAll(fazendaId: string, maeId?: string) {
    const where = maeId ? { maeId, mae: { fazendaId } } : { mae: { fazendaId } };
    return this.partoRepository.find({ where, relations: { crias: true } });
  }

  async findOne(fazendaId: string, id: string) {
    const parto = await this.partoRepository.findOne({
      where: { id },
      relations: { crias: true, mae: true },
    });
    if (!parto) {
      throw new NotFoundException(`Parto ${id} não encontrado`);
    }
    if (parto.mae.fazendaId !== fazendaId) {
      throw new ForbiddenException('Este parto não pertence à sua fazenda');
    }
    return parto;
  }

  async update(fazendaId: string, id: string, dto: UpdatePartoDto) {
    const parto = await this.findOne(fazendaId, id);
    Object.assign(parto, dto);
    return this.partoRepository.save(parto);
  }
}