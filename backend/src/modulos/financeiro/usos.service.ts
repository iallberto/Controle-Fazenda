import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipoLancamento } from './entities/categoria-financeira.entity';
import { OrigemLancamento } from './entities/lancamento.entity';
import { RegistroUso, SituacaoUso } from './entities/registro-uso.entity';
import { CategoriasService } from './categorias.service';
import { LancamentosService } from './lancamentos.service';
import { RegistrarUsoDto } from './dto/financeiro.dto';

// "40.00" → "40"; "2.50" → "2,5"
export function formatarQuantidade(quantidade: string | number) {
  return Number(quantidade).toLocaleString('pt-BR', {
    maximumFractionDigits: 2,
  });
}

// Itens usados ou trazidos, sem valor (spec 003, US4, FR-022 a FR-025). Dono e
// funcionário registram e veem a lista da fazenda; nenhum valor sai daqui.
// Só o dono valoriza (vira despesa) ou descarta.
@Injectable()
export class UsosService {
  constructor(
    @InjectRepository(RegistroUso)
    private readonly usoRepository: Repository<RegistroUso>,
    private readonly categoriasService: CategoriasService,
    private readonly lancamentosService: LancamentosService,
  ) {}

  async listar(fazendaId: string, situacao?: SituacaoUso) {
    const registros = await this.usoRepository.find({
      where: { fazendaId, ...(situacao && { situacao }) },
      relations: {
        categoria: true,
        animal: true,
        pasto: true,
        criadoPor: true,
      },
      order: { data: 'DESC', criadoEm: 'DESC' },
    });
    // Campo a campo, para nunca levar valor nem dado interno (FR-023, SC-006)
    return registros.map((r) => ({
      id: r.id,
      data: r.data,
      item: r.item,
      quantidade: Number(r.quantidade),
      unidade: r.unidade,
      categoria: r.categoria?.nome ?? null,
      animal: r.animal ? { id: r.animal.id, brinco: r.animal.brinco } : null,
      pasto: r.pasto ? { id: r.pasto.id, nome: r.pasto.nome } : null,
      registradoPor: r.criadoPor?.nome ?? null,
      situacao: r.situacao,
      motivoDescarte: r.motivoDescarte,
    }));
  }

  // Só os nomes das categorias de despesa ativas, para a escolha no registro
  async categorias(fazendaId: string) {
    const categorias = await this.categoriasService.listar(fazendaId, {
      tipo: TipoLancamento.DESPESA,
    });
    return categorias.map((c) => ({ id: c.id, nome: c.nome }));
  }

  async registrar(fazendaId: string, usuarioId: string, dto: RegistrarUsoDto) {
    await this.categoriasService.validarParaLancar(
      fazendaId,
      dto.categoriaId,
      TipoLancamento.DESPESA,
    );
    await this.lancamentosService.validarAnimalOuPasto(
      fazendaId,
      dto.animalId,
      dto.pastoId,
    );
    const registro = await this.usoRepository.save(
      this.usoRepository.create({
        fazendaId,
        data: dto.data,
        item: dto.item,
        quantidade: String(dto.quantidade),
        unidade: dto.unidade,
        categoriaId: dto.categoriaId,
        animalId: dto.animalId ?? null,
        pastoId: dto.pastoId ?? null,
        situacao: SituacaoUso.AGUARDANDO,
        lancamentoId: null,
        motivoDescarte: null,
        criadoPorId: usuarioId,
      }),
    );
    return { id: registro.id, situacao: registro.situacao };
  }

  // Dono informa o valor: vira despesa ligada ao registro (FR-024)
  async valorar(
    fazendaId: string,
    usuarioId: string,
    id: string,
    valorCentavos: number,
  ) {
    const registro = await this.buscarAguardando(fazendaId, id);
    await this.usoRepository.manager.transaction(async (manager) => {
      const lancamento = await this.lancamentosService.lancarNaTransacao(
        manager,
        {
          fazendaId,
          usuarioId,
          tipo: TipoLancamento.DESPESA,
          data: registro.data,
          valorCentavos,
          categoriaId: registro.categoriaId,
          descricao: `${registro.item} — ${formatarQuantidade(registro.quantidade)} ${registro.unidade}`,
          origem: OrigemLancamento.USO,
          animalId: registro.animalId,
          pastoId: registro.pastoId,
          registroUsoId: registro.id,
        },
      );
      await manager.update(
        RegistroUso,
        { id },
        {
          situacao: SituacaoUso.LANCADO,
          lancamentoId: lancamento.id,
          atualizadoPorId: usuarioId,
        },
      );
    });
    return { situacao: SituacaoUso.LANCADO };
  }

  async descartar(
    fazendaId: string,
    usuarioId: string,
    id: string,
    motivo: string,
  ) {
    await this.buscarAguardando(fazendaId, id);
    await this.usoRepository.update(
      { id },
      {
        situacao: SituacaoUso.DESCARTADO,
        motivoDescarte: motivo.trim(),
        atualizadoPorId: usuarioId,
      },
    );
    return { situacao: SituacaoUso.DESCARTADO };
  }

  contarAguardando(fazendaId: string) {
    return this.usoRepository.countBy({
      fazendaId,
      situacao: SituacaoUso.AGUARDANDO,
    });
  }

  private async buscarAguardando(fazendaId: string, id: string) {
    const registro = await this.usoRepository.findOneBy({ id });
    if (!registro || registro.fazendaId !== fazendaId) {
      throw new NotFoundException('Registro de uso não encontrado');
    }
    if (registro.situacao !== SituacaoUso.AGUARDANDO) {
      throw new BadRequestException(
        registro.situacao === SituacaoUso.LANCADO
          ? 'Este registro já virou despesa'
          : 'Este registro foi descartado',
      );
    }
    return registro;
  }
}
