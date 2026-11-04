import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, EntityManager, In, Repository } from 'typeorm';
import {
  Animal,
  CategoriaAnimal,
  StatusAnimal,
} from '../../animal/entities/animal.entity';
import {
  registrarSaidaDoRebanho,
  voltarAoRebanho,
} from '../../animal/saida-do-rebanho';
import { Pesagem } from '../../pesagem/entities/pesagem.entity';
import { ValorArrobaCategoria } from '../../configuracao/entities/valor-arroba-categoria.entity';
import { hojeLocal } from '../../common/datas';
import {
  CodigoCategoria,
  TipoLancamento,
} from './entities/categoria-financeira.entity';
import { Lancamento, OrigemLancamento } from './entities/lancamento.entity';
import {
  FormaPrecoVenda,
  ItemVenda,
  VendaAnimais,
} from './entities/venda-animais.entity';
import { CategoriasService } from './categorias.service';
import { LancamentosService } from './lancamentos.service';
import {
  calcularVenda,
  ErroCalculoVenda,
  KG_POR_ARROBA_PADRAO,
} from './dominio/calculo-venda';
import { VendaDto } from './dto/financeiro.dto';

// Venda de animais (spec 003, US2; research R4). Uma transação só: venda,
// itens, pesagem de venda, saída do rebanho e receita. Se algo falhar, nada fica.
@Injectable()
export class VendasService {
  constructor(
    @InjectRepository(VendaAnimais)
    private readonly vendaRepository: Repository<VendaAnimais>,
    @InjectRepository(ItemVenda)
    private readonly itemRepository: Repository<ItemVenda>,
    @InjectRepository(Animal)
    private readonly animalRepository: Repository<Animal>,
    @InjectRepository(Pesagem)
    private readonly pesagemRepository: Repository<Pesagem>,
    @InjectRepository(ValorArrobaCategoria)
    private readonly valorArrobaRepository: Repository<ValorArrobaCategoria>,
    private readonly categoriasService: CategoriasService,
    private readonly lancamentosService: LancamentosService,
  ) {}

  // Animais ativos para montar a venda, com a última pesagem e o kg da arroba
  async animaisDisponiveis(
    fazendaId: string,
    filtro: { pastoId?: string; categoria?: string },
  ) {
    const animais = await this.animalRepository.find({
      where: {
        fazendaId,
        status: StatusAnimal.ATIVO,
        ...(filtro.pastoId && { pastoAtualId: filtro.pastoId }),
        ...(filtro.categoria && {
          categoria: filtro.categoria as CategoriaAnimal,
        }),
      },
      relations: { pastoAtual: true },
    });
    const [pesagens, kgPorCategoria] = await Promise.all([
      this.ultimasPesagens(animais.map((a) => a.id)),
      this.kgPorArroba(fazendaId),
    ]);
    return animais
      .sort((a, b) =>
        a.brinco.localeCompare(b.brinco, 'pt-BR', { numeric: true }),
      )
      .map((animal) => ({
        id: animal.id,
        brinco: animal.brinco,
        categoria: animal.categoria,
        sexo: animal.sexo,
        pasto: animal.pastoAtual
          ? { id: animal.pastoAtual.id, nome: animal.pastoAtual.nome }
          : null,
        ultimaPesagem: pesagens.get(animal.id) ?? null,
        kgPorArroba:
          kgPorCategoria.get(animal.categoria) ?? KG_POR_ARROBA_PADRAO,
      }));
  }

  // Prévia da venda, sem gravar nada (FR-012)
  async simular(fazendaId: string, dto: VendaDto) {
    const animais = await this.animalRepository.find({
      where: { id: In(dto.itens.map((i) => i.animalId)) },
    });
    const { calculo } = await this.validarECalcular(fazendaId, dto, animais);
    return {
      itens: dto.itens.map((item, i) => ({
        animalId: item.animalId,
        ...calculo.itens[i],
      })),
      arrobasTotal: calculo.arrobasTotal,
      valorTotalCentavos: calculo.valorTotalCentavos,
    };
  }

  async registrar(fazendaId: string, usuarioId: string, dto: VendaDto) {
    const vendaId = await this.vendaRepository.manager.transaction(
      async (manager) => {
        // Lock dos animais: duas vendas ao mesmo tempo não levam o mesmo animal
        const animais = await manager.find(Animal, {
          where: { id: In(dto.itens.map((i) => i.animalId)) },
          lock: { mode: 'pessimistic_write' },
        });
        const { calculo, porId } = await this.validarECalcular(
          fazendaId,
          dto,
          animais,
          manager,
        );

        const venda = await manager.save(
          manager.create(VendaAnimais, {
            fazendaId,
            data: dto.data,
            comprador: dto.comprador,
            forma: dto.forma,
            precoArrobaCentavos:
              dto.forma === FormaPrecoVenda.POR_ARROBA
                ? (dto.precoArrobaCentavos ?? null)
                : null,
            valorTotalCentavos: calculo.valorTotalCentavos,
            observacao: dto.observacao || null,
            criadoPorId: usuarioId,
          }),
        );

        for (const [i, itemDto] of dto.itens.entries()) {
          const animal = porId.get(itemDto.animalId)!;
          const pesagem = itemDto.pesoKg
            ? await manager.save(
                manager.create(Pesagem, {
                  animalId: animal.id,
                  pesoKg: itemDto.pesoKg,
                  data: dto.data,
                  pesadoPorId: usuarioId,
                  lancadoPorId: usuarioId,
                  observacao: 'Pesagem de venda',
                }),
              )
            : null;
          await manager.save(
            manager.create(ItemVenda, {
              vendaId: venda.id,
              animalId: animal.id,
              categoriaNaVenda: animal.categoria,
              pesoKg: itemDto.pesoKg ? String(itemDto.pesoKg) : null,
              arrobas:
                calculo.itens[i].arrobas === null
                  ? null
                  : String(calculo.itens[i].arrobas),
              valorCentavos: calculo.itens[i].valorCentavos,
              pastoAnteriorId: animal.pastoAtualId,
              pesagemId: pesagem?.id ?? null,
            }),
          );
          await registrarSaidaDoRebanho(manager, {
            animal,
            status: StatusAnimal.VENDIDO,
            data: dto.data,
            motivo: `Venda para ${dto.comprador}`,
            usuarioId,
          });
        }

        const categoria = await this.categoriasService.porCodigo(
          manager,
          CodigoCategoria.VENDA_ANIMAIS,
        );
        const quantidade = dto.itens.length;
        await this.lancamentosService.lancarNaTransacao(manager, {
          fazendaId,
          usuarioId,
          tipo: TipoLancamento.RECEITA,
          data: dto.data,
          valorCentavos: calculo.valorTotalCentavos,
          categoriaId: categoria.id,
          descricao: `Venda de ${quantidade === 1 ? '1 animal' : `${quantidade} animais`} para ${dto.comprador}`,
          origem: OrigemLancamento.VENDA,
          animalId: quantidade === 1 ? dto.itens[0].animalId : null,
          vendaId: venda.id,
        });
        return venda.id;
      },
    );
    return this.detalhar(fazendaId, vendaId);
  }

  async listar(fazendaId: string, periodo: { de?: string; ate?: string }) {
    const vendas = await this.vendaRepository.find({
      where: {
        fazendaId,
        ...(periodo.de &&
          periodo.ate && { data: Between(periodo.de, periodo.ate) }),
      },
      relations: { itens: true },
      order: { data: 'DESC', criadoEm: 'DESC' },
    });
    return vendas.map((venda) => ({
      id: venda.id,
      data: venda.data,
      comprador: venda.comprador,
      forma: venda.forma,
      valorTotalCentavos: venda.valorTotalCentavos,
      animais: venda.itens?.length ?? 0,
      cancelamento: venda.cancelamento,
    }));
  }

  async detalhar(fazendaId: string, id: string) {
    const venda = await this.vendaRepository.findOne({
      where: { id },
      relations: { itens: { animal: true, pastoAnterior: true } },
    });
    if (!venda || venda.fazendaId !== fazendaId) {
      throw new NotFoundException('Venda não encontrada');
    }
    return {
      id: venda.id,
      data: venda.data,
      comprador: venda.comprador,
      forma: venda.forma,
      precoArrobaCentavos: venda.precoArrobaCentavos,
      valorTotalCentavos: venda.valorTotalCentavos,
      observacao: venda.observacao,
      cancelamento: venda.cancelamento,
      itens: (venda.itens ?? [])
        .map((item) => ({
          animalId: item.animalId,
          brinco: item.animal?.brinco ?? '',
          categoria: item.categoriaNaVenda,
          pesoKg: item.pesoKg === null ? null : Number(item.pesoKg),
          arrobas: item.arrobas === null ? null : Number(item.arrobas),
          valorCentavos: item.valorCentavos,
          pastoAnterior: item.pastoAnterior?.nome ?? null,
        }))
        .sort((a, b) =>
          a.brinco.localeCompare(b.brinco, 'pt-BR', { numeric: true }),
        ),
    };
  }

  // Cancela a receita e devolve os animais ao pasto de antes (FR-015)
  async cancelar(
    fazendaId: string,
    usuarioId: string,
    id: string,
    motivo: string,
  ) {
    const venda = await this.vendaRepository.findOne({
      where: { id },
      relations: { itens: true },
    });
    if (!venda || venda.fazendaId !== fazendaId) {
      throw new NotFoundException('Venda não encontrada');
    }
    if (venda.cancelamento.cancelado) {
      throw new BadRequestException('Esta venda já foi cancelada');
    }
    const cancelamento = {
      cancelado: true,
      canceladoEm: new Date(),
      canceladoPorId: usuarioId,
      motivoCancelamento: motivo.trim(),
    };
    await this.vendaRepository.manager.transaction(async (manager) => {
      await manager.update(
        VendaAnimais,
        { id },
        { cancelamento, atualizadoPorId: usuarioId },
      );
      await manager.update(
        Lancamento,
        { vendaId: id },
        { cancelamento, atualizadoPorId: usuarioId },
      );
      for (const item of venda.itens ?? []) {
        await voltarAoRebanho(manager, {
          animalId: item.animalId,
          pastoId: item.pastoAnteriorId,
          data: hojeLocal(),
          usuarioId,
        });
      }
    });
    return { cancelado: true };
  }

  // Venda não cancelada de um animal, para a página do animal (FR-016)
  async vendaDoAnimal(fazendaId: string, animalId: string) {
    const item = await this.itemRepository.findOne({
      where: {
        animalId,
        venda: { fazendaId, cancelamento: { cancelado: false } },
      },
      relations: { venda: true },
    });
    if (!item?.venda) throw new NotFoundException('Venda não encontrada');
    return {
      vendaId: item.vendaId,
      data: item.venda.data,
      comprador: item.venda.comprador,
      pesoKg: item.pesoKg === null ? null : Number(item.pesoKg),
      arrobas: item.arrobas === null ? null : Number(item.arrobas),
      valorCentavos: item.valorCentavos,
    };
  }

  private async validarECalcular(
    fazendaId: string,
    dto: VendaDto,
    animais: Animal[],
    manager?: EntityManager,
  ) {
    const ids = dto.itens.map((i) => i.animalId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Há animais repetidos na venda');
    }
    const porId = new Map(animais.map((a) => [a.id, a]));
    for (const id of ids) {
      const animal = porId.get(id);
      if (!animal || animal.fazendaId !== fazendaId) {
        throw new NotFoundException('Animal não encontrado');
      }
      if (animal.status !== StatusAnimal.ATIVO) {
        throw new BadRequestException(
          `O animal ${animal.brinco} não está mais no rebanho`,
        );
      }
    }
    // Um animal em no máximo uma venda não cancelada
    const emOutraVenda = await (
      manager ? manager.getRepository(ItemVenda) : this.itemRepository
    ).findOne({
      where: {
        animalId: In(ids),
        venda: { cancelamento: { cancelado: false } },
      },
      relations: { animal: true },
    });
    if (emOutraVenda) {
      throw new ConflictException(
        `O animal ${emOutraVenda.animal?.brinco ?? ''} já está em outra venda`,
      );
    }

    const kgPorCategoria = await this.kgPorArroba(fazendaId);
    try {
      const calculo = calcularVenda({
        forma: dto.forma,
        precoArrobaCentavos: dto.precoArrobaCentavos,
        valorTotalCentavos: dto.valorTotalCentavos,
        itens: dto.itens.map((item) => ({
          pesoKg: item.pesoKg ?? null,
          kgPorArroba:
            kgPorCategoria.get(porId.get(item.animalId)!.categoria) ?? null,
        })),
      });
      return { calculo, porId };
    } catch (erro) {
      if (erro instanceof ErroCalculoVenda) {
        throw new BadRequestException(erro.message);
      }
      throw erro;
    }
  }

  private async kgPorArroba(fazendaId: string) {
    const valores = await this.valorArrobaRepository.find({
      where: { configuracaoFazenda: { fazendaId } },
    });
    return new Map(
      valores
        .filter((v) => Number(v.pesoReferenciaKg) > 0)
        .map((v) => [v.categoria, Number(v.pesoReferenciaKg)]),
    );
  }

  private async ultimasPesagens(animalIds: string[]) {
    const mapa = new Map<string, { data: string; pesoKg: number }>();
    if (animalIds.length === 0) return mapa;
    const pesagens = await this.pesagemRepository.find({
      where: { animalId: In(animalIds) },
      order: { data: 'DESC', criadoEm: 'DESC' },
    });
    for (const p of pesagens) {
      if (!mapa.has(p.animalId)) {
        mapa.set(p.animalId, { data: p.data, pesoKg: Number(p.pesoKg) });
      }
    }
    return mapa;
  }
}
