import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Animal, OrigemAnimal } from '../../animal/entities/animal.entity';
import { AnimalService } from '../../animal/animal.service';
import { PapelUsuario } from '../../usuario/entities/usuario.entity';
import { hojeLocal } from '../../common/datas';
import { ModuloFazenda } from '../acesso/entities/modulo-fazenda.entity';
import { ModuloPago } from '../acesso/modulo-pago';
import {
  CodigoCategoria,
  TipoLancamento,
} from './entities/categoria-financeira.entity';
import { CompraAnimal } from './entities/compra-animal.entity';
import { OrigemLancamento } from './entities/lancamento.entity';
import { CategoriasService } from './categorias.service';
import { LancamentosService } from './lancamentos.service';
import { CompraComAnimalDto, ValorCompraDto } from './dto/financeiro.dto';

// Compras de animais (spec 003, FR-016b, FR-016c; research R8). Valor 0 = o
// dono não quis lançar; maior que zero vira despesa em "Compra de animais".
@Injectable()
export class ComprasService {
  constructor(
    @InjectRepository(CompraAnimal)
    private readonly compraRepository: Repository<CompraAnimal>,
    @InjectRepository(Animal)
    private readonly animalRepository: Repository<Animal>,
    @InjectRepository(ModuloFazenda)
    private readonly moduloRepository: Repository<ModuloFazenda>,
    private readonly animalService: AnimalService,
    private readonly categoriasService: CategoriasService,
    private readonly lancamentosService: LancamentosService,
  ) {}

  // Cadastro do animal comprado + compra + despesa, numa transação só
  async comprar(fazendaId: string, usuarioId: string, dto: CompraComAnimalDto) {
    if (dto.origem !== OrigemAnimal.COMPRADO) {
      throw new BadRequestException('Use esta rota só para animal comprado');
    }
    const { valorCentavos, vendedor, ...dadosAnimal } = dto;
    return this.animalService.create(
      fazendaId,
      usuarioId,
      dadosAnimal,
      (manager, animal) =>
        this.registrarCompra(manager, {
          fazendaId,
          usuarioId,
          animal,
          valorCentavos,
          vendedor,
        }),
    );
  }

  // Animais comprados cadastrados por funcionário, depois da primeira
  // liberação do Financeiro, ainda sem compra registrada (FR-016c)
  async semValor(fazendaId: string) {
    const inicio = await this.inicioDoFinanceiro(fazendaId);
    if (!inicio) return [];
    const animais = await this.animalRepository
      .createQueryBuilder('animal')
      .innerJoinAndSelect('animal.criadoPor', 'usuario')
      .leftJoin(CompraAnimal, 'compra', 'compra.animal_id = animal.id')
      .where('animal.fazenda_id = :fazendaId', { fazendaId })
      .andWhere('animal.origem = :origem', { origem: OrigemAnimal.COMPRADO })
      .andWhere('usuario.papel = :papel', { papel: PapelUsuario.FUNCIONARIO })
      .andWhere('animal.criado_em >= :inicio', { inicio })
      .andWhere('compra.id IS NULL')
      .orderBy('animal.criado_em', 'ASC')
      .getMany();
    return animais.map((animal) => ({
      animalId: animal.id,
      brinco: animal.brinco,
      categoria: animal.categoria,
      dataCompra: animal.dataCompra,
      procedencia: animal.procedencia,
      cadastradoPor: animal.criadoPor?.nome ?? null,
      cadastradoEm: animal.criadoEm,
    }));
  }

  async contarSemValor(fazendaId: string) {
    return (await this.semValor(fazendaId)).length;
  }

  // O dono informa o valor de uma compra pendente (0 tira da lista sem lançar)
  async valorarPendente(
    fazendaId: string,
    usuarioId: string,
    animalId: string,
    dto: ValorCompraDto,
  ) {
    const animal = await this.animalRepository.findOneBy({ id: animalId });
    if (!animal || animal.fazendaId !== fazendaId) {
      throw new NotFoundException('Animal não encontrado');
    }
    if (animal.origem !== OrigemAnimal.COMPRADO) {
      throw new BadRequestException('Este animal não foi comprado');
    }
    if (await this.compraRepository.existsBy({ animalId })) {
      throw new ConflictException('A compra deste animal já foi registrada');
    }
    await this.compraRepository.manager.transaction((manager) =>
      this.registrarCompra(manager, {
        fazendaId,
        usuarioId,
        animal,
        valorCentavos: dto.valorCentavos,
        vendedor: dto.vendedor,
      }),
    );
    return { registrada: true, lancada: dto.valorCentavos > 0 };
  }

  private async registrarCompra(
    manager: EntityManager,
    dados: {
      fazendaId: string;
      usuarioId: string;
      animal: Animal;
      valorCentavos: number;
      vendedor?: string;
    },
  ) {
    const compra = await manager.save(
      manager.create(CompraAnimal, {
        fazendaId: dados.fazendaId,
        animalId: dados.animal.id,
        valorCentavos: dados.valorCentavos,
        vendedor: dados.vendedor || dados.animal.procedencia || null,
        lancamentoId: null,
        criadoPorId: dados.usuarioId,
      }),
    );
    if (dados.valorCentavos <= 0) return;

    const categoria = await this.categoriasService.porCodigo(
      manager,
      CodigoCategoria.COMPRA_ANIMAIS,
    );
    const lancamento = await this.lancamentosService.lancarNaTransacao(
      manager,
      {
        fazendaId: dados.fazendaId,
        usuarioId: dados.usuarioId,
        tipo: TipoLancamento.DESPESA,
        data: dados.animal.dataCompra ?? hojeLocal(),
        valorCentavos: dados.valorCentavos,
        categoriaId: categoria.id,
        descricao: `Compra do animal ${dados.animal.brinco}${compra.vendedor ? ` de ${compra.vendedor}` : ''}`,
        origem: OrigemLancamento.COMPRA,
        animalId: dados.animal.id,
        compraId: compra.id,
      },
    );
    await manager.update(
      CompraAnimal,
      { id: compra.id },
      { lancamentoId: lancamento.id },
    );
  }

  private async inicioDoFinanceiro(fazendaId: string) {
    const primeiro = await this.moduloRepository.findOne({
      where: { fazendaId, modulo: ModuloPago.FINANCEIRO },
      order: { liberadoEm: 'ASC' },
    });
    return primeiro?.liberadoEm ?? null;
  }
}
