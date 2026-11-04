import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import {
  Animal,
  CategoriaAnimal,
  Sexo,
  StatusAnimal,
} from '../animal/entities/animal.entity';
import { Parto } from '../parto/entities/parto.entity';
import { hojeLocal } from '../common/datas';
import { DIAS_DESCANSO_POS_PARTO, motivoInaptidao } from './dominio/aptidao';
import { somarDias } from './dominio/datas';
import { ExposicaoMonta } from './entities/exposicao-monta.entity';
import { Inseminacao } from './entities/inseminacao.entity';
import { DiagnosticoGestacao } from './entities/diagnostico-gestacao.entity';

export interface FiltroFemeas {
  pastoId?: string;
  categoria?: CategoriaAnimal;
}

// Consultas de situação reprodutiva compartilhadas por estações, diagnósticos e inseminações
@Injectable()
export class SituacaoService {
  constructor(
    @InjectRepository(Animal)
    private readonly animalRepository: Repository<Animal>,
    @InjectRepository(Parto)
    private readonly partoRepository: Repository<Parto>,
    @InjectRepository(ExposicaoMonta)
    private readonly exposicaoRepository: Repository<ExposicaoMonta>,
    @InjectRepository(Inseminacao)
    private readonly inseminacaoRepository: Repository<Inseminacao>,
    @InjectRepository(DiagnosticoGestacao)
    private readonly diagnosticoRepository: Repository<DiagnosticoGestacao>,
  ) {}

  // Situação reprodutiva de uma fêmea para o Manejo e o detalhe do animal (FR-027).
  // "Exposta" e "inseminada" são situações derivadas, não status (research R3).
  async situacao(fazendaId: string, animalId: string, hoje = hojeLocal()) {
    const animal = await this.animalRepository.findOneBy({ id: animalId });
    if (!animal || animal.fazendaId !== fazendaId) {
      throw new NotFoundException('Animal não encontrado');
    }
    if (animal.sexo !== Sexo.F) {
      return { aplicavel: false as const };
    }

    const [exposicoesAbertas, ultimaInseminacao, ultimoDiagnostico, partos] =
      await Promise.all([
        this.exposicaoRepository.find({
          where: {
            femeaId: animalId,
            dataFim: IsNull(),
            cancelamento: { cancelado: false },
          },
          relations: { estacao: { touro: true, pasto: true } },
        }),
        this.inseminacaoRepository.findOne({
          where: { femeaId: animalId, cancelamento: { cancelado: false } },
          relations: { semen: true },
          order: { data: 'DESC', criadoEm: 'DESC' },
        }),
        this.diagnosticoRepository.findOne({
          where: { femeaId: animalId, cancelamento: { cancelado: false } },
          order: { data: 'DESC', criadoEm: 'DESC' },
        }),
        this.ultimosPartos([animalId]),
      ]);
    const ultimoParto = partos.get(animalId) ?? null;
    const motivo = motivoInaptidao(animal, ultimoParto, hoje);
    // Inseminação sem diagnóstico depois dela ainda está "aguardando diagnóstico"
    const inseminacaoPendente =
      ultimaInseminacao &&
      (!ultimoDiagnostico || ultimoDiagnostico.data < ultimaInseminacao.data)
        ? ultimaInseminacao
        : null;

    return {
      aplicavel: true as const,
      statusReprodutivo: animal.statusReprodutivo,
      apta: motivo === null,
      motivoInaptidao: motivo,
      aptaEm:
        ultimoParto && motivo?.startsWith('pariu')
          ? somarDias(ultimoParto, DIAS_DESCANSO_POS_PARTO)
          : null,
      expostaA: exposicoesAbertas.map((exposicao) => ({
        estacaoId: exposicao.estacaoId,
        touroBrinco: exposicao.estacao?.touro?.brinco ?? null,
        pasto: exposicao.estacao?.pasto?.nome ?? null,
        desde: exposicao.dataInicio,
      })),
      inseminacaoPendente: inseminacaoPendente
        ? {
            data: inseminacaoPendente.data,
            tipo: inseminacaoPendente.tipo,
            semen: inseminacaoPendente.semen?.nomeTouro ?? null,
          }
        : null,
      ultimoDiagnostico: ultimoDiagnostico
        ? {
            id: ultimoDiagnostico.id,
            data: ultimoDiagnostico.data,
            resultado: ultimoDiagnostico.resultado,
            idadeGestacionalDias: ultimoDiagnostico.idadeGestacionalDias,
          }
        : null,
      ultimoParto,
      // Preenchida pela previsão de parto (US3)
      previsaoParto: null,
    };
  }

  // Fêmeas ativas do grupo que podem entrar em cobertura na data (FR-003)
  async listarAptas(
    fazendaId: string,
    filtro: FiltroFemeas,
    data = hojeLocal(),
  ) {
    const candidatas = await this.buscarFemeas(fazendaId, filtro);
    const partos = await this.ultimosPartos(
      candidatas.map((femea) => femea.id),
    );
    return candidatas.filter(
      (femea) =>
        motivoInaptidao(femea, partos.get(femea.id) ?? null, data) === null,
    );
  }

  // Por que uma fêmea específica não pode entrar em cobertura; null se pode
  async motivoInaptidao(femea: Animal, data = hojeLocal()) {
    const partos = await this.ultimosPartos([femea.id]);
    return motivoInaptidao(femea, partos.get(femea.id) ?? null, data);
  }

  // Fêmeas ativas de matriz/novilha do grupo, em ordem de brinco
  async buscarFemeas(fazendaId: string, filtro: FiltroFemeas) {
    const categorias = filtro.categoria
      ? [filtro.categoria]
      : [CategoriaAnimal.MATRIZ, CategoriaAnimal.NOVILHA];
    const femeas = await this.animalRepository.find({
      where: {
        fazendaId,
        status: StatusAnimal.ATIVO,
        sexo: Sexo.F,
        categoria: In(categorias),
        ...(filtro.pastoId && { pastoAtualId: filtro.pastoId }),
      },
    });
    return femeas.sort((a, b) =>
      a.brinco.localeCompare(b.brinco, 'pt-BR', { numeric: true }),
    );
  }

  // Data do último parto de cada fêmea
  async ultimosPartos(femeaIds: string[]) {
    const mapa = new Map<string, string>();
    if (femeaIds.length === 0) return mapa;
    const linhas = await this.partoRepository
      .createQueryBuilder('parto')
      .select('parto.maeId', 'maeId')
      .addSelect('MAX(parto.data)', 'data')
      .where('parto.maeId IN (:...femeaIds)', { femeaIds })
      .groupBy('parto.maeId')
      .getRawMany<{ maeId: string; data: string | Date }>();
    for (const linha of linhas) {
      const data =
        linha.data instanceof Date
          ? linha.data.toISOString()
          : String(linha.data);
      mapa.set(linha.maeId, data.slice(0, 10));
    }
    return mapa;
  }
}
