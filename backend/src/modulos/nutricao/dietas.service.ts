import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, In } from 'typeorm';
import { Dieta, ItemDieta } from './entities/dieta.entity';
import { Insumo } from './entities/insumo.entity';
import { LoteAlimentacao } from './entities/lote-alimentacao.entity';
import { normalizarNome } from './dominio/regras';
import { DietaDto } from './dto/nutricao.dto';

// Dietas: insumo e quantidade por animal por dia (spec 005, FR-010). Só o
// dono altera; mudar a dieta vale para os próximos fornecimentos.
@Injectable()
export class DietasService {
  constructor(@InjectEntityManager() private readonly manager: EntityManager) {}

  async listar(fazendaId: string) {
    const [dietas, lotes] = await Promise.all([
      this.manager.find(Dieta, {
        where: { fazendaId },
        relations: { itens: { insumo: true, unidade: true } },
        order: { nome: 'ASC' },
      }),
      this.manager.find(LoteAlimentacao, { where: { fazendaId, ativo: true } }),
    ]);
    return dietas.map((d) => ({
      id: d.id,
      nome: d.nome,
      ativa: d.ativa,
      itens: (d.itens ?? [])
        .sort((a, b) => (a.insumo?.nome ?? '').localeCompare(b.insumo?.nome ?? '', 'pt-BR'))
        .map((i) => ({
        insumoId: i.insumoId,
        insumo: i.insumo?.nome ?? '',
        insumoAtivo: i.insumo?.ativo ?? false,
        quantidadePorAnimal: i.quantidadePorAnimal,
        unidadeId: i.unidadeId,
        unidade: i.unidade?.nome ?? '',
      })),
      lotes: lotes.filter((l) => l.dietaId === d.id).map((l) => ({ id: l.id, nome: l.nome })),
    }));
  }

  async criar(fazendaId: string, usuarioId: string, dto: DietaDto) {
    await this.garantirNomeLivre(fazendaId, dto.nome);
    await this.validarItens(fazendaId, dto);
    return this.manager.transaction(async (manager) => {
      const dieta = await manager.save(
        manager.create(Dieta, { fazendaId, nome: dto.nome, ativa: true, criadoPorId: usuarioId }),
      );
      await manager.save(dto.itens.map((i) => manager.create(ItemDieta, {
          insumoId: i.insumoId,
          quantidadePorAnimal: i.quantidadePorAnimal,
          unidadeId: i.unidadeId,
          dietaId: dieta.id,
        })));
      return { id: dieta.id, nome: dieta.nome };
    });
  }

  // Substitui nome e itens (PUT)
  async substituir(fazendaId: string, usuarioId: string, id: string, dto: DietaDto) {
    const dieta = await this.buscar(fazendaId, id);
    if (normalizarNome(dto.nome) !== normalizarNome(dieta.nome)) {
      await this.garantirNomeLivre(fazendaId, dto.nome, id);
    }
    await this.validarItens(fazendaId, dto);
    return this.manager.transaction(async (manager) => {
      await manager.delete(ItemDieta, { dietaId: id });
      await manager.save(dto.itens.map((i) => manager.create(ItemDieta, {
          insumoId: i.insumoId,
          quantidadePorAnimal: i.quantidadePorAnimal,
          unidadeId: i.unidadeId,
          dietaId: id,
        })));
      await manager.update(Dieta, { id }, { nome: dto.nome, atualizadoPorId: usuarioId });
      return { id, nome: dto.nome };
    });
  }

  async ativar(fazendaId: string, usuarioId: string, id: string, ativa: boolean) {
    await this.buscar(fazendaId, id);
    await this.manager.update(Dieta, { id }, { ativa, atualizadoPorId: usuarioId });
    return { id, ativa };
  }

  async buscar(fazendaId: string, id: string) {
    const dieta = await this.manager.findOne(Dieta, { where: { id } });
    if (!dieta || dieta.fazendaId !== fazendaId) throw new NotFoundException('Dieta não encontrada');
    return dieta;
  }

  private async validarItens(fazendaId: string, dto: DietaDto) {
    const ids = dto.itens.map((i) => i.insumoId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Cada insumo entra uma vez só na dieta');
    }
    const insumos = await this.manager.find(Insumo, {
      where: { id: In(ids) },
      relations: { unidades: true },
    });
    for (const item of dto.itens) {
      const insumo = insumos.find((i) => i.id === item.insumoId);
      if (!insumo || insumo.fazendaId !== fazendaId) throw new NotFoundException('Insumo não encontrado');
      if (!insumo.ativo) throw new BadRequestException(`O insumo ${insumo.nome} está desativado`);
      const unidade = insumo.unidades?.find((u) => u.id === item.unidadeId);
      if (!unidade || !unidade.ativa) {
        throw new BadRequestException(`Unidade inválida para ${insumo.nome}`);
      }
    }
  }

  private async garantirNomeLivre(fazendaId: string, nome: string, exceto?: string) {
    const dietas = await this.manager.find(Dieta, { where: { fazendaId } });
    if (dietas.some((d) => d.id !== exceto && normalizarNome(d.nome) === normalizarNome(nome))) {
      throw new ConflictException('Já existe uma dieta com este nome');
    }
  }
}
