import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CodigoIdentificacao,
  StatusCodigo,
} from '../codigo-identificacao/entities/codigo-identificacao.entity';
import { Animal, CategoriaAnimal, StatusAnimal } from '../animal/entities/animal.entity';
import { Pesagem } from '../pesagem/entities/pesagem.entity';
import { Tratamento } from '../tratamento/entities/tratamento.entity';
import { calcularGmd } from '../pesagem/gmd';
import { ValorArrobaCategoria } from '../configuracao/entities/valor-arroba-categoria.entity';

// Situação da etiqueta escaneada:
// ATIVO: animal no rebanho, dados exibidos
// FORA_DO_REBANHO: animal vendido, morto ou descartado; nenhum dado do animal é exibido
// ETIQUETA_SUBSTITUIDA: a etiqueta foi trocada por outra (reemissão)
export type SituacaoConsulta = 'ATIVO' | 'FORA_DO_REBANHO' | 'ETIQUETA_SUBSTITUIDA';

const FORMATO_CODIGO = /^[0-9a-f]{8}$/;

// Usado quando a fazenda ainda não configurou o peso da arroba da categoria
const KG_POR_ARROBA_PADRAO = 15;

@Injectable()
export class ConsultaPublicaService {
  constructor(
    @InjectRepository(CodigoIdentificacao)
    private readonly codigoRepository: Repository<CodigoIdentificacao>,
    @InjectRepository(Animal)
    private readonly animalRepository: Repository<Animal>,
    @InjectRepository(Pesagem)
    private readonly pesagemRepository: Repository<Pesagem>,
    @InjectRepository(Tratamento)
    private readonly tratamentoRepository: Repository<Tratamento>,
    @InjectRepository(ValorArrobaCategoria)
    private readonly valorArrobaRepository: Repository<ValorArrobaCategoria>,
  ) {}

  // Rota sem login: a resposta é montada campo a campo para nunca expor dados
  // internos (quem lançou, pasto, motivo de saída, observações, ids).
  async consultar(codigo: string) {
    const texto = codigo.trim().toLowerCase();
    if (!FORMATO_CODIGO.test(texto)) {
      throw new NotFoundException('Etiqueta não encontrada');
    }

    const registro = await this.codigoRepository.findOne({
      where: { codigo: texto },
      relations: { fazenda: true },
    });
    if (!registro || registro.status === StatusCodigo.DISPONIVEL || !registro.animalId) {
      throw new NotFoundException('Etiqueta não encontrada');
    }

    const fazenda = { nome: registro.fazenda.nome };
    if (registro.status === StatusCodigo.DESATIVADO) {
      return { situacao: 'ETIQUETA_SUBSTITUIDA' as SituacaoConsulta, fazenda, animal: null };
    }

    const animal = await this.animalRepository.findOne({
      where: { id: registro.animalId },
      relations: { raca: true, mae: true },
    });
    if (!animal) {
      throw new NotFoundException('Etiqueta não encontrada');
    }
    if (animal.status !== StatusAnimal.ATIVO) {
      return { situacao: 'FORA_DO_REBANHO' as SituacaoConsulta, fazenda, animal: null };
    }

    const pesagens = await this.pesagemRepository.find({
      where: { animalId: animal.id },
      // criadoEm desempata pesagens do mesmo dia
      order: { data: 'ASC', criadoEm: 'ASC' },
    });
    const historicoPesagens = calcularGmd(
      pesagens.map((pesagem) => ({ data: pesagem.data, pesoKg: Number(pesagem.pesoKg) })),
    );

    const tratamentos = await this.tratamentoRepository.find({
      where: { animalId: animal.id },
      order: { data: 'DESC', criadoEm: 'DESC' },
    });

    const ultimaPesagem = historicoPesagens.at(-1);
    const pesoAtual = ultimaPesagem
      ? {
          ...ultimaPesagem,
          arrobas: await this.converterEmArrobas(
            registro.fazendaId,
            animal.categoria,
            ultimaPesagem.pesoKg,
          ),
        }
      : null;

    return {
      situacao: 'ATIVO' as SituacaoConsulta,
      fazenda,
      animal: {
        brinco: animal.brinco,
        raca: animal.raca?.nome ?? null,
        sexo: animal.sexo,
        categoria: animal.categoria,
        dataNascimento: animal.dataNascimento,
        origem: animal.origem,
        maeBrinco: animal.mae?.brinco ?? null,
        pesoAtual,
        // Mais recente primeiro, como numa linha do tempo
        pesagens: [...historicoPesagens].reverse(),
        tratamentos: tratamentos.map((tratamento) => ({
          produto: tratamento.produto,
          data: tratamento.data,
        })),
      },
    };
  }

  // Usa o peso da arroba que a fazenda configurou para a categoria do animal
  // (Configurações → Peso de referência da arroba). Uma casa decimal.
  private async converterEmArrobas(fazendaId: string, categoria: CategoriaAnimal, pesoKg: number) {
    const referencia = await this.valorArrobaRepository.findOne({
      where: { configuracaoFazenda: { fazendaId }, categoria },
    });
    const kgPorArroba = Number(referencia?.pesoReferenciaKg) || KG_POR_ARROBA_PADRAO;
    return Math.round((pesoKg / kgPorArroba) * 10) / 10;
  }
}
