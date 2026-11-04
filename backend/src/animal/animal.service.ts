import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Animal, CategoriaAnimal, Sexo, StatusAnimal } from './entities/animal.entity';
import {
  CodigoIdentificacao,
  StatusCodigo,
} from '../codigo-identificacao/entities/codigo-identificacao.entity';
import { MovimentacaoPasto } from '../movimentacao-pasto/entities/movimentacao-pasto.entity';
import { Pasto } from '../pasto/entities/pasto.entity';
import { CreateAnimalDto } from './dto/create-animal.dto';
import { UpdateAnimalDto } from './dto/update-animal.dto';
import { encerrarExposicoesPorSaida } from '../reproducao/saida';
import {
  garantirAnimalAtivo,
  garantirRacaDisponivel,
  reservarCodigo,
} from '../common/vinculos';

@Injectable()
export class AnimalService {
  constructor(
    @InjectRepository(Animal)
    private readonly animalRepository: Repository<Animal>,
    @InjectRepository(CodigoIdentificacao)
    private readonly codigoRepository: Repository<CodigoIdentificacao>,
    @InjectRepository(Pasto)
    private readonly pastoRepository: Repository<Pasto>,
  ) {}

  async create(fazendaId: string, usuarioLogadoId: string, dto: CreateAnimalDto) {
    this.validarSexoCategoria(dto.sexo, dto.categoria);

    const codigo = await this.codigoRepository.findOneBy({ id: dto.codigoId });
    if (!codigo || codigo.fazendaId !== fazendaId) {
      throw new NotFoundException('Código não encontrado');
    }
    if (codigo.status !== StatusCodigo.DISPONIVEL) {
      throw new ConflictException('Este código já está vinculado ou foi desativado');
    }

    await this.validarVinculos(fazendaId, dto);
    if (dto.pastoAtualId) {
      await this.garantirPastoDaMesmaFazenda(fazendaId, dto.pastoAtualId);
    }

    return this.animalRepository.manager.transaction(async (manager) => {
      const animal = manager.create(Animal, {
        fazendaId,
        brinco: String(codigo.numero),
        sexo: dto.sexo,
        categoria: dto.categoria,
        statusReprodutivo: dto.statusReprodutivo,
        origem: dto.origem,
        dataNascimento: dto.dataNascimento,
        racaId: dto.racaId,
        maeId: dto.maeId,
        paiId: dto.paiId,
        pastoAtualId: dto.pastoAtualId,
        caracteristicasVisuais: dto.caracteristicasVisuais,
        dataCompra: dto.dataCompra,
        procedencia: dto.procedencia,
        status: StatusAnimal.ATIVO,
        criadoPorId: usuarioLogadoId,
      });
      const animalSalvo = await manager.save(animal);

      await reservarCodigo(manager, codigo.id, animalSalvo.id);

      if (dto.pastoAtualId) {
        const movimentacao = manager.create(MovimentacaoPasto, {
          animalId: animalSalvo.id,
          pastoId: dto.pastoAtualId,
          dataEntrada: dto.dataNascimento,
          dataSaida: null,
          criadoPorId: usuarioLogadoId,
        });
        await manager.save(movimentacao);
      }

      return animalSalvo;
    });
  }

  findAll(fazendaId: string, categoria?: CategoriaAnimal) {
    const where = categoria ? { fazendaId, categoria } : { fazendaId };
    return this.animalRepository.find({ where });
  }

  async findOne(fazendaId: string, id: string) {
    const animal = await this.animalRepository.findOne({
      where: { id },
      relations: { mae: true, pai: true, paiSemen: true, pastoAtual: true },
    });
    if (!animal || animal.fazendaId !== fazendaId) {
      throw new NotFoundException(`Animal ${id} não encontrado`);
    }
    return animal;
  }

  async findByBrinco(fazendaId: string, brinco: string) {
    const animal = await this.animalRepository.findOneBy({ fazendaId, brinco });
    if (!animal) {
      throw new NotFoundException(`Animal com brinco ${brinco} não encontrado`);
    }
    return animal;
  }

  async update(fazendaId: string, usuarioLogadoId: string, id: string, dto: UpdateAnimalDto) {
    const animal = await this.findOne(fazendaId, id);
    if (dto.sexo || dto.categoria) {
      const sexoEfetivo = dto.sexo ?? animal.sexo;
      const categoriaEfetiva = dto.categoria ?? animal.categoria;
      this.validarSexoCategoria(sexoEfetivo, categoriaEfetiva);
    }
    if (dto.maeId === id || dto.paiId === id) {
      throw new BadRequestException('Um animal não pode ser mãe ou pai de si mesmo');
    }
    await this.validarVinculos(fazendaId, dto);
    Object.assign(animal, dto);
    animal.atualizadoPorId = usuarioLogadoId;
    return this.animalRepository.save(animal);
  }

  async alterarStatus(
    fazendaId: string,
    usuarioLogadoId: string,
    id: string,
    novoStatus: StatusAnimal,
    motivo: string,
    data: string,
  ) {
    if (novoStatus === StatusAnimal.ATIVO) {
      throw new BadRequestException('Use um status de saída (vendido, morto ou descartado)');
    }
    const animal = await this.findOne(fazendaId, id);
    garantirAnimalAtivo(animal);

    return this.animalRepository.manager.transaction(async (manager) => {
      // O animal sai do rebanho: fecha a permanência no pasto atual
      const movimentacaoAberta = await manager.findOne(MovimentacaoPasto, {
        where: { animalId: animal.id, dataSaida: IsNull() },
      });
      if (movimentacaoAberta) {
        movimentacaoAberta.dataSaida = data;
        await manager.save(movimentacaoAberta);
      }

      animal.status = novoStatus;
      animal.motivoStatus = motivo;
      animal.dataStatus = data;
      animal.pastoAtualId = null;
      animal.pastoAtual = undefined;
      animal.atualizadoPorId = usuarioLogadoId;

      // Saiu do rebanho: encerra exposições (fêmea) ou a estação (touro)
      await encerrarExposicoesPorSaida(manager, {
        animalIds: [animal.id],
        data,
        saida: 'REBANHO',
        usuarioId: usuarioLogadoId,
      });
      return manager.save(animal);
    });
  }

  private async validarVinculos(
    fazendaId: string,
    dto: { maeId?: string; paiId?: string; racaId?: string },
  ) {
    if (dto.maeId) {
      await this.garantirParenteDaMesmaFazenda(fazendaId, dto.maeId, 'mãe', Sexo.F);
    }
    if (dto.paiId) {
      await this.garantirParenteDaMesmaFazenda(fazendaId, dto.paiId, 'pai', Sexo.M);
    }
    if (dto.racaId) {
      await garantirRacaDisponivel(this.animalRepository.manager, fazendaId, dto.racaId);
    }
  }

  private validarSexoCategoria(sexo: Sexo, categoria: CategoriaAnimal) {
    const categoriasPorSexo: Record<Sexo, CategoriaAnimal[]> = {
      [Sexo.F]: [CategoriaAnimal.NOVILHA, CategoriaAnimal.MATRIZ],
      [Sexo.M]: [
        CategoriaAnimal.BEZERRO,
        CategoriaAnimal.GARROTE,
        CategoriaAnimal.BOI,
        CategoriaAnimal.TOURO,
      ],
    };

    if (!categoriasPorSexo[sexo].includes(categoria)) {
      throw new BadRequestException(
        `Categoria ${categoria} não é válida para o sexo ${sexo}`,
      );
    }
  }

  private async garantirParenteDaMesmaFazenda(
    fazendaId: string,
    parenteId: string,
    papel: string,
    sexoEsperado: Sexo,
  ) {
    const parente = await this.animalRepository.findOneBy({ id: parenteId });
    if (!parente || parente.fazendaId !== fazendaId) {
      throw new NotFoundException(`Animal indicado como ${papel} não encontrado`);
    }
    if (parente.sexo !== sexoEsperado) {
      throw new BadRequestException(`O animal indicado como ${papel} deve ser do sexo ${sexoEsperado}`);
    }
  }

  private async garantirPastoDaMesmaFazenda(fazendaId: string, pastoId: string) {
    const pasto = await this.pastoRepository.findOneBy({ id: pastoId });
    if (!pasto || pasto.fazendaId !== fazendaId) {
      throw new NotFoundException('Pasto não encontrado');
    }
  }
}