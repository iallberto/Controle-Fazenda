import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import {
  Animal,
  CategoriaAnimal,
  Sexo,
  StatusAnimal,
  StatusReprodutivo,
} from '../animal/entities/animal.entity';
import { Parto } from '../parto/entities/parto.entity';
import { hojeLocal } from '../common/datas';
import { DIAS_DESCANSO_POS_PARTO, motivoInaptidao } from './dominio/aptidao';
import { somarDias } from './dominio/datas';
import { ExposicaoMonta } from './entities/exposicao-monta.entity';
import { Inseminacao } from './entities/inseminacao.entity';
import {
  DiagnosticoGestacao,
  ResultadoDiagnostico,
} from './entities/diagnostico-gestacao.entity';
import { Raca } from '../raca/entities/raca.entity';
import { BasePrevisao, calcularPrevisaoParto } from './dominio/previsao-parto';
import { buscarCandidatosPai } from './candidatos';

interface EventoBase {
  id: string;
  data: string;
  criadoEm: Date;
  cancelado: boolean;
  motivoCancelamento: string | null;
}

type EventoHistorico = EventoBase &
  (
    | {
        tipo: 'EXPOSICAO';
        estacaoId: string;
        touroBrinco: string | null;
        pasto: string | null;
        dataFim: string | null;
        motivoFim: ExposicaoMonta['motivoFim'];
      }
    | {
        tipo: 'INSEMINACAO';
        tipoInseminacao: Inseminacao['tipo'];
        semen: string | null;
      }
    | {
        tipo: 'DIAGNOSTICO';
        resultado: ResultadoDiagnostico;
        metodo: DiagnosticoGestacao['metodo'];
        idadeGestacionalDias: number | null;
      }
    | { tipo: 'PERDA'; motivo: string | null }
    | { tipo: 'PARTO'; resultado: Parto['resultado']; tipoParto: Parto['tipo'] }
  );

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
    @InjectRepository(Raca)
    private readonly racaRepository: Repository<Raca>,
  ) {}

  // Prévia do pai antes de registrar o parto (mesma regra do parto, research R6)
  async candidatosPai(
    fazendaId: string,
    maeId: string,
    dataParto = hojeLocal(),
  ) {
    const mae = await this.animalRepository.findOneBy({ id: maeId });
    if (!mae || mae.fazendaId !== fazendaId) {
      throw new NotFoundException('Animal não encontrado');
    }
    const resultado = await buscarCandidatosPai(
      this.animalRepository.manager,
      mae,
      dataParto,
    );
    return { touros: resultado.touros, semens: resultado.semens };
  }

  // Previsão de parto das fêmeas prenhes (FR-018), calculada na hora a partir
  // dos registros válidos (research R5). Também devolve a cobertura considerada.
  async previsoesParto(femeas: Animal[]) {
    const resultado = new Map<
      string,
      { data: string; base: BasePrevisao; touros: string[]; semens: string[] }
    >();
    const prenhes = femeas.filter(
      (femea) => femea.statusReprodutivo === StatusReprodutivo.PRENHE,
    );
    if (prenhes.length === 0) return resultado;
    const ids = prenhes.map((femea) => femea.id);
    const naoCancelado = { cancelamento: { cancelado: false } };

    const [diagnosticos, inseminacoes, exposicoes, racas] = await Promise.all([
      this.diagnosticoRepository.find({
        where: {
          femeaId: In(ids),
          resultado: ResultadoDiagnostico.PRENHE,
          ...naoCancelado,
        },
        order: { data: 'DESC', criadoEm: 'DESC' },
      }),
      this.inseminacaoRepository.find({
        where: { femeaId: In(ids), ...naoCancelado },
        relations: { semen: true },
      }),
      this.exposicaoRepository.find({
        where: { femeaId: In(ids), ...naoCancelado },
        relations: { estacao: { touro: true } },
      }),
      this.racaRepository.findBy({
        id: In(
          prenhes
            .map((femea) => femea.racaId)
            .filter((id): id is string => !!id),
        ),
      }),
    ]);
    const gestacaoPorRaca = new Map(
      racas.map((raca) => [raca.id, raca.gestacaoMediaDias]),
    );

    for (const femea of prenhes) {
      const diagnostico = diagnosticos.find(
        (item) => item.femeaId === femea.id,
      );
      if (!diagnostico) continue;
      const suasInseminacoes = inseminacoes.filter(
        (item) => item.femeaId === femea.id && item.data <= diagnostico.data,
      );
      // Exposições de estações canceladas não contam
      const suasExposicoes = exposicoes.filter(
        (item) =>
          item.femeaId === femea.id &&
          item.dataInicio <= diagnostico.data &&
          !item.estacao?.cancelamento.cancelado,
      );
      const previsao = calcularPrevisaoParto({
        diagnostico: {
          data: diagnostico.data,
          idadeGestacionalDias: diagnostico.idadeGestacionalDias,
        },
        inseminacoes: suasInseminacoes,
        exposicoes: suasExposicoes,
        gestacaoMediaDias: femea.racaId
          ? gestacaoPorRaca.get(femea.racaId)
          : null,
      });
      if (!previsao) continue;
      resultado.set(femea.id, {
        ...previsao,
        touros: [
          ...new Set(
            suasExposicoes
              .map((item) => item.estacao?.touro?.brinco)
              .filter((brinco): brinco is string => !!brinco),
          ),
        ],
        semens: [
          ...new Set(
            suasInseminacoes
              .map((item) => item.semen?.nomeTouro)
              .filter((nome): nome is string => !!nome),
          ),
        ],
      });
    }
    return resultado;
  }

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
    const previsao = (await this.previsoesParto([animal])).get(animal.id);
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
      previsaoParto: previsao
        ? { data: previsao.data, base: previsao.base }
        : null,
    };
  }

  // Linha do tempo reprodutiva da fêmea, do mais recente ao mais antigo (FR-023).
  // Registros cancelados aparecem marcados, com o motivo.
  async historico(fazendaId: string, animalId: string) {
    const animal = await this.animalRepository.findOneBy({ id: animalId });
    if (!animal || animal.fazendaId !== fazendaId) {
      throw new NotFoundException('Animal não encontrado');
    }
    if (animal.sexo !== Sexo.F) return [];

    const [exposicoes, inseminacoes, diagnosticos, partos] = await Promise.all([
      this.exposicaoRepository.find({
        where: { femeaId: animalId },
        relations: { estacao: { touro: true, pasto: true } },
      }),
      this.inseminacaoRepository.find({
        where: { femeaId: animalId },
        relations: { semen: true },
      }),
      this.diagnosticoRepository.find({ where: { femeaId: animalId } }),
      this.partoRepository.find({ where: { maeId: animalId } }),
    ]);

    const eventos: EventoHistorico[] = [
      ...exposicoes.map((exposicao) => {
        const estacaoCancelada = !!exposicao.estacao?.cancelamento.cancelado;
        return {
          tipo: 'EXPOSICAO' as const,
          id: exposicao.id,
          data: exposicao.dataInicio,
          criadoEm: exposicao.criadoEm,
          estacaoId: exposicao.estacaoId,
          touroBrinco: exposicao.estacao?.touro?.brinco ?? null,
          pasto: exposicao.estacao?.pasto?.nome ?? null,
          dataFim: exposicao.dataFim,
          motivoFim: exposicao.motivoFim,
          cancelado: exposicao.cancelamento.cancelado || estacaoCancelada,
          motivoCancelamento: exposicao.cancelamento.cancelado
            ? exposicao.cancelamento.motivoCancelamento
            : estacaoCancelada
              ? exposicao.estacao!.cancelamento.motivoCancelamento
              : null,
        };
      }),
      ...inseminacoes.map((inseminacao) => ({
        tipo: 'INSEMINACAO' as const,
        id: inseminacao.id,
        data: inseminacao.data,
        criadoEm: inseminacao.criadoEm,
        tipoInseminacao: inseminacao.tipo,
        semen: inseminacao.semen?.nomeTouro ?? null,
        cancelado: inseminacao.cancelamento.cancelado,
        motivoCancelamento: inseminacao.cancelamento.motivoCancelamento,
      })),
      ...diagnosticos.map((diagnostico) =>
        diagnostico.resultado === ResultadoDiagnostico.PERDA
          ? {
              tipo: 'PERDA' as const,
              id: diagnostico.id,
              data: diagnostico.data,
              criadoEm: diagnostico.criadoEm,
              motivo: diagnostico.motivo,
              cancelado: diagnostico.cancelamento.cancelado,
              motivoCancelamento: diagnostico.cancelamento.motivoCancelamento,
            }
          : {
              tipo: 'DIAGNOSTICO' as const,
              id: diagnostico.id,
              data: diagnostico.data,
              criadoEm: diagnostico.criadoEm,
              resultado: diagnostico.resultado,
              metodo: diagnostico.metodo,
              idadeGestacionalDias: diagnostico.idadeGestacionalDias,
              cancelado: diagnostico.cancelamento.cancelado,
              motivoCancelamento: diagnostico.cancelamento.motivoCancelamento,
            },
      ),
      ...partos.map((parto) => ({
        tipo: 'PARTO' as const,
        id: parto.id,
        data: parto.data,
        criadoEm: parto.criadoEm,
        resultado: parto.resultado,
        tipoParto: parto.tipo,
        cancelado: false,
        motivoCancelamento: null,
      })),
    ];

    // Mais recente primeiro; no mesmo dia, o lançado por último vem antes
    return eventos
      .sort(
        (a, b) =>
          b.data.localeCompare(a.data) ||
          new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime(),
      )
      .map(({ criadoEm: _criadoEm, ...evento }) => evento);
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
