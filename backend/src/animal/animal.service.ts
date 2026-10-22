import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Animal, CategoriaAnimal, Sexo, StatusAnimal } from './entities/animal.entity';
import {
  CodigoIdentificacao,
  StatusCodigo,
} from '../codigo-identificacao/entities/codigo-identificacao.entity';
import { MovimentacaoPasto } from '../movimentacao-pasto/entities/movimentacao-pasto.entity';
import { CreateAnimalDto } from './dto/create-animal.dto';
import { UpdateAnimalDto } from './dto/update-animal.dto';

@Injectable()
export class AnimalService {
  constructor(
    @InjectRepository(Animal)
    private readonly animalRepository: Repository<Animal>,
    @InjectRepository(CodigoIdentificacao)
    private readonly codigoRepository: Repository<CodigoIdentificacao>,
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

    if (dto.maeId) {
      await this.garantirParenteDaMesmaFazenda(fazendaId, dto.maeId, 'mãe');
    }
    if (dto.paiId) {
      await this.garantirParenteDaMesmaFazenda(fazendaId, dto.paiId, 'pai');
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

      codigo.status = StatusCodigo.VINCULADO;
      codigo.animalId = animalSalvo.id;
      codigo.vinculadoEm = new Date();
      await manager.save(codigo);

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
      relations: { mae: true },
    });
    if (!animal) {
      throw new NotFoundException(`Animal ${id} não encontrado`);
    }
    if (animal.fazendaId !== fazendaId) {
      throw new ForbiddenException('Este animal não pertence à sua fazenda');
    }
    return animal;
  }

  async update(fazendaId: string, id: string, dto: UpdateAnimalDto) {
    const animal = await this.findOne(fazendaId, id);
    if (dto.sexo || dto.categoria) {
      const sexoEfetivo = dto.sexo ?? animal.sexo;
      const categoriaEfetiva = dto.categoria ?? animal.categoria;
      this.validarSexoCategoria(sexoEfetivo, categoriaEfetiva);
    }
    Object.assign(animal, dto);
    return this.animalRepository.save(animal);
  }

  async alterarStatus(
    fazendaId: string,
    id: string,
    novoStatus: StatusAnimal,
    motivo: string,
    data: string,
  ) {
    const animal = await this.findOne(fazendaId, id);
    animal.status = novoStatus;
    animal.motivoStatus = motivo;
    animal.dataStatus = data;
    return this.animalRepository.save(animal);
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
  ) {
    const parente = await this.animalRepository.findOneBy({ id: parenteId });
    if (!parente) {
      throw new NotFoundException(`Animal indicado como ${papel} não encontrado`);
    }
    if (parente.fazendaId !== fazendaId) {
      throw new BadRequestException(`O animal indicado como ${papel} pertence a outra fazenda`);
    }
  }
}