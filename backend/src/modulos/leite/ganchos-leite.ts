import {
  Injectable,
  OnModuleInit,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import {
  EventosRebanho,
  ganchosRebanho,
} from '../../common/ganchos-rebanho';
import { Animal, Sexo } from '../../animal/entities/animal.entity';
import { somarDias } from '../../reproducao/dominio/datas';
import { AcessoModulosService } from '../acesso/acesso-modulos.service';
import { ModuloPago } from '../acesso/modulo-pago';
import { Lactacao, MotivoFimLactacao } from './entities/lactacao.entity';
import { ProdutoLeite } from './entities/produto-leite.entity';
import { CarenciaLeite } from './entities/carencia-leite.entity';
import { ehVacaDeLeite, normalizarNome } from './dominio/regras';
import {
  abrirLactacaoDoParto,
  encerrarLactacao,
  lactacaoAberta,
  recalcularDescarte,
} from './lactacao-base';

// O Leite reage ao que acontece no rebanho (spec 004, research R1): abre e
// encerra lactações e grava a carência dos tratamentos. Tudo na transação de
// quem emitiu; um erro aqui desfaz a operação inteira.
@Injectable()
export class GanchosLeite implements OnModuleInit {
  constructor(private readonly acessoModulos: AcessoModulosService) {}

  onModuleInit() {
    ganchosRebanho.registrar('partoRegistrado', (m, d) => this.aoRegistrarParto(m, d));
    ganchosRebanho.registrar('partoAlterado', (m, d) => this.aoAlterarParto(m, d));
    ganchosRebanho.registrar('saidaDoRebanho', (m, d) => this.aoSairDoRebanho(m, d));
    ganchosRebanho.registrar('tratamentoGravado', (m, d) => this.aoGravarTratamento(m, d));
  }

  // Parto de vaca de leite abre lactação com o Leite ativo ou só consulta (R2)
  async aoRegistrarParto(
    manager: EntityManager,
    dados: EventosRebanho['partoRegistrado'],
  ) {
    const situacao = await this.acessoModulos.situacao(dados.fazendaId, ModuloPago.LEITE);
    if (situacao === 'NAO_CONTRATADO') return;
    const mae = await manager.findOne(Animal, {
      where: { id: dados.maeId },
      relations: { raca: true },
    });
    if (!mae || !ehVacaDeLeite(mae)) return;
    await abrirLactacaoDoParto(manager, {
      fazendaId: dados.fazendaId,
      animalId: mae.id,
      partoId: dados.partoId,
      data: dados.data,
      usuarioId: dados.usuarioId,
    });
  }

  // Data do parto corrigida: o início da lactação (e o fim da anterior) acompanha
  async aoAlterarParto(
    manager: EntityManager,
    dados: EventosRebanho['partoAlterado'],
  ) {
    const lactacao = await manager.findOne(Lactacao, {
      where: { partoId: dados.partoId },
    });
    if (!lactacao) return;
    const anterior = await manager.findOne(Lactacao, {
      where: {
        animalId: dados.maeId,
        motivoFim: MotivoFimLactacao.NOVO_PARTO,
        fim: somarDias(dados.dataAnterior, -1),
      },
    });
    if (anterior) {
      anterior.fim = somarDias(dados.dataNova, -1);
      anterior.atualizadoPorId = dados.usuarioId;
      await manager.save(anterior);
    }
    lactacao.inicio = dados.dataNova;
    lactacao.atualizadoPorId = dados.usuarioId;
    await manager.save(lactacao);
  }

  // Vendida, morta ou descartada: a lactação termina na data da saída (FR-008)
  async aoSairDoRebanho(
    manager: EntityManager,
    dados: EventosRebanho['saidaDoRebanho'],
  ) {
    const aberta = await lactacaoAberta(manager, dados.animalId);
    if (!aberta) return;
    await encerrarLactacao(
      manager,
      aberta,
      dados.data,
      MotivoFimLactacao.SAIDA,
      dados.usuarioId,
    );
  }

  // Carência do tratamento (FR-015a, FR-016; R6). Com o Leite ativo, o produto
  // dado a uma fêmea precisa estar no cadastro; a carência do produto no dia é
  // copiada e o descarte das ordenhas do intervalo é recalculado.
  async aoGravarTratamento(
    manager: EntityManager,
    dados: EventosRebanho['tratamentoGravado'],
  ) {
    const situacao = await this.acessoModulos.situacao(dados.fazendaId, ModuloPago.LEITE);
    if (situacao !== 'ATIVO') return;
    const animal = await manager.findOne(Animal, { where: { id: dados.animalId } });
    if (!animal || animal.sexo !== Sexo.F) return;

    const anterior = dados.novo
      ? null
      : await manager.findOne(CarenciaLeite, {
          where: { tratamentoId: dados.tratamentoId },
        });

    const procurado = normalizarNome(dados.produto);
    const produtos = await manager.find(ProdutoLeite, {
      where: { fazendaId: dados.fazendaId },
    });
    const produto = produtos.find((p) => normalizarNome(p.nome) === procurado);
    if (!produto) {
      // Correção de um tratamento antigo, sem carência gravada: nada a fazer
      if (!dados.novo && !anterior) return;
      throw new UnprocessableEntityException({
        codigo: 'PRODUTO_SEM_CADASTRO',
        produto: dados.produto,
        message: 'Cadastre o produto com a carência de leite',
      });
    }

    const novo =
      produto.carenciaLeiteDias > 0
        ? {
            data: dados.data,
            dataFim: somarDias(dados.data, produto.carenciaLeiteDias),
          }
        : null;
    // Correção sem mudança de produto nem de data: a carência copiada fica
    if (
      anterior &&
      novo &&
      anterior.produtoId === produto.id &&
      anterior.data === dados.data
    ) {
      return;
    }

    if (anterior) await manager.delete(CarenciaLeite, { id: anterior.id });
    if (novo) {
      await manager.save(
        manager.create(CarenciaLeite, {
          fazendaId: dados.fazendaId,
          animalId: dados.animalId,
          tratamentoId: dados.tratamentoId,
          produtoId: produto.id,
          data: novo.data,
          carenciaDias: produto.carenciaLeiteDias,
          dataFim: novo.dataFim,
        }),
      );
    }

    const datas = [anterior?.data, anterior?.dataFim, novo?.data, novo?.dataFim].filter(
      (d): d is string => !!d,
    );
    if (datas.length > 0) {
      datas.sort((a, b) => a.localeCompare(b));
      await recalcularDescarte(
        manager,
        dados.animalId,
        datas[0],
        datas[datas.length - 1],
      );
    }
  }
}
