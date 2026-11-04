import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, Repository } from 'typeorm';
import {
  CategoriaFinanceira,
  CodigoCategoria,
  TipoLancamento,
} from './entities/categoria-financeira.entity';
import { CriarCategoriaDto, EditarCategoriaDto } from './dto/financeiro.dto';

function semAcento(texto: string) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
}

// Categorias de receita e despesa (spec 003, FR-005, FR-006; research R6).
// As padrão (sem fazenda) são só leitura; as da fazenda o dono cria, renomeia e
// desativa, nunca apaga.
@Injectable()
export class CategoriasService {
  constructor(
    @InjectRepository(CategoriaFinanceira)
    private readonly categoriaRepository: Repository<CategoriaFinanceira>,
  ) {}

  async listar(
    fazendaId: string,
    filtro: { tipo?: TipoLancamento; incluirInativas?: boolean } = {},
  ) {
    const categorias = await this.categoriaRepository.find({
      where: [
        { fazendaId: IsNull(), ...(filtro.tipo && { tipo: filtro.tipo }) },
        { fazendaId, ...(filtro.tipo && { tipo: filtro.tipo }) },
      ],
    });
    return categorias
      .filter((c) => filtro.incluirInativas || c.ativa)
      .map((c) => ({
        id: c.id,
        tipo: c.tipo,
        nome: c.nome,
        codigo: c.codigo,
        ativa: c.ativa,
        padrao: c.fazendaId === null,
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  async criar(fazendaId: string, dto: CriarCategoriaDto) {
    await this.garantirNomeLivre(fazendaId, dto.tipo, dto.nome);
    return this.categoriaRepository.save(
      this.categoriaRepository.create({
        fazendaId,
        tipo: dto.tipo,
        nome: dto.nome,
        codigo: null,
        ativa: true,
      }),
    );
  }

  async editar(fazendaId: string, id: string, dto: EditarCategoriaDto) {
    const categoria = await this.categoriaRepository.findOneBy({ id });
    if (
      !categoria ||
      (categoria.fazendaId && categoria.fazendaId !== fazendaId)
    ) {
      throw new NotFoundException('Categoria não encontrada');
    }
    if (categoria.fazendaId === null) {
      throw new BadRequestException(
        'As categorias padrão não podem ser alteradas; crie uma da fazenda',
      );
    }
    if (dto.nome && semAcento(dto.nome) !== semAcento(categoria.nome)) {
      await this.garantirNomeLivre(fazendaId, categoria.tipo, dto.nome);
    }
    await this.categoriaRepository.update(
      { id },
      {
        ...(dto.nome !== undefined && { nome: dto.nome }),
        ...(dto.ativa !== undefined && { ativa: dto.ativa }),
      },
    );
    return this.categoriaRepository.findOneBy({ id });
  }

  // Categoria usável num lançamento do tipo: padrão ou da fazenda, e ativa
  async validarParaLancar(
    fazendaId: string,
    categoriaId: string,
    tipo: TipoLancamento,
  ) {
    const categoria = await this.categoriaRepository.findOneBy({
      id: categoriaId,
    });
    if (
      !categoria ||
      (categoria.fazendaId && categoria.fazendaId !== fazendaId)
    ) {
      throw new NotFoundException('Categoria não encontrada');
    }
    if (categoria.tipo !== tipo) {
      throw new BadRequestException(
        tipo === TipoLancamento.RECEITA
          ? 'Escolha uma categoria de receita'
          : 'Escolha uma categoria de despesa',
      );
    }
    if (!categoria.ativa) {
      throw new BadRequestException('Esta categoria está desativada');
    }
    return categoria;
  }

  // Categoria padrão pelo código (ex.: Venda de animais), dentro da transação
  async porCodigo(manager: EntityManager, codigo: CodigoCategoria) {
    const categoria = await manager.findOneBy(CategoriaFinanceira, {
      codigo,
      fazendaId: IsNull(),
    });
    if (!categoria) {
      throw new NotFoundException(`Categoria padrão ${codigo} não encontrada`);
    }
    return categoria;
  }

  private async garantirNomeLivre(
    fazendaId: string,
    tipo: TipoLancamento,
    nome: string,
  ) {
    const existentes = await this.categoriaRepository.find({
      where: [
        { fazendaId: IsNull(), tipo },
        { fazendaId, tipo },
      ],
    });
    if (existentes.some((c) => semAcento(c.nome) === semAcento(nome))) {
      throw new ConflictException('Já existe uma categoria com esse nome');
    }
  }
}
