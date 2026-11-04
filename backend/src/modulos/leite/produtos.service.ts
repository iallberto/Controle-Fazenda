import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { ProdutoLeite } from './entities/produto-leite.entity';
import { normalizarNome } from './dominio/regras';
import { CriarProdutoDto, EditarProdutoDto } from './dto/leite.dto';

// Cadastro de produtos com a carência de leite (spec 004, FR-015). Mudar a
// carência de um produto não muda as carências já gravadas nos tratamentos.
@Injectable()
export class ProdutosService {
  constructor(
    @InjectEntityManager() private readonly manager: EntityManager,
  ) {}

  async listar(fazendaId: string, incluirInativos = false) {
    const produtos = await this.manager.find(ProdutoLeite, {
      where: incluirInativos ? { fazendaId } : { fazendaId, ativo: true },
    });
    return produtos.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  async criar(fazendaId: string, usuarioId: string, dto: CriarProdutoDto) {
    await this.garantirNomeLivre(fazendaId, dto.nome);
    return this.manager.save(
      this.manager.create(ProdutoLeite, {
        fazendaId,
        nome: dto.nome,
        carenciaLeiteDias: dto.carenciaLeiteDias,
        ativo: true,
        criadoPorId: usuarioId,
      }),
    );
  }

  async editar(
    fazendaId: string,
    usuarioId: string,
    id: string,
    dto: EditarProdutoDto,
  ) {
    const produto = await this.manager.findOne(ProdutoLeite, { where: { id } });
    if (!produto || produto.fazendaId !== fazendaId) {
      throw new NotFoundException('Produto não encontrado');
    }
    if (dto.nome !== undefined && normalizarNome(dto.nome) !== normalizarNome(produto.nome)) {
      await this.garantirNomeLivre(fazendaId, dto.nome, id);
    }
    Object.assign(produto, dto, { atualizadoPorId: usuarioId });
    return this.manager.save(produto);
  }

  private async garantirNomeLivre(fazendaId: string, nome: string, exceto?: string) {
    const produtos = await this.manager.find(ProdutoLeite, { where: { fazendaId } });
    const procurado = normalizarNome(nome);
    if (produtos.some((p) => p.id !== exceto && normalizarNome(p.nome) === procurado)) {
      throw new ConflictException('Já existe um produto com este nome');
    }
  }
}
