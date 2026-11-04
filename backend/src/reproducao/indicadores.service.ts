import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  Animal,
  Sexo,
  StatusAnimal,
  StatusReprodutivo,
} from '../animal/entities/animal.entity';
import { Parto } from '../parto/entities/parto.entity';
import { hojeLocal } from '../common/datas';
import { EstacaoMonta } from './entities/estacao-monta.entity';
import { ExposicaoMonta } from './entities/exposicao-monta.entity';
import { Inseminacao } from './entities/inseminacao.entity';
import { DiagnosticoGestacao } from './entities/diagnostico-gestacao.entity';
import { diasEntre, maiorData } from './dominio/datas';
import {
  calcularIntervalosPartos,
  calcularTaxaPrenhez,
  somarTaxas,
  type CoberturaParaTaxa,
  type TaxaPrenhez,
} from './dominio/taxa-prenhez';

// Indicadores reprodutivos (US6): taxa de prenhez, intervalo entre partos e
// vacas vazias. Só leitura; registros cancelados ficam fora (FR-026).
@Injectable()
export class IndicadoresService {
  constructor(
    @InjectRepository(EstacaoMonta)
    private readonly estacaoRepository: Repository<EstacaoMonta>,
    @InjectRepository(ExposicaoMonta)
    private readonly exposicaoRepository: Repository<ExposicaoMonta>,
    @InjectRepository(Inseminacao)
    private readonly inseminacaoRepository: Repository<Inseminacao>,
    @InjectRepository(DiagnosticoGestacao)
    private readonly diagnosticoRepository: Repository<DiagnosticoGestacao>,
    @InjectRepository(Animal)
    private readonly animalRepository: Repository<Animal>,
    @InjectRepository(Parto)
    private readonly partoRepository: Repository<Parto>,
  ) {}

  async indicadores(fazendaId: string) {
    const [estacoes, inseminacoes, partos] = await Promise.all([
      this.estacaoRepository.find({
        where: { fazendaId, cancelamento: { cancelado: false } },
        relations: { touro: true, pasto: true, exposicoes: { femea: true } },
        order: { dataEntrada: 'DESC' },
      }),
      this.inseminacaoRepository.find({
        where: { femea: { fazendaId }, cancelamento: { cancelado: false } },
        relations: { femea: true, semen: true },
      }),
      this.partoRepository.find({
        where: { mae: { fazendaId, status: StatusAnimal.ATIVO } },
        relations: { mae: true },
      }),
    ]);

    const femeaIds = new Set<string>();
    estacoes.forEach((e) =>
      e.exposicoes?.forEach((x) => femeaIds.add(x.femeaId)),
    );
    inseminacoes.forEach((i) => femeaIds.add(i.femeaId));
    const diagnosticos =
      femeaIds.size > 0
        ? await this.diagnosticoRepository.find({
            where: {
              femeaId: In([...femeaIds]),
              cancelamento: { cancelado: false },
            },
            // No mesmo dia, vale o lançado primeiro (a ordenação da taxa é estável)
            order: { data: 'ASC', criadoEm: 'ASC' },
          })
        : [];

    const porEstacao = estacoes.map((estacao) => {
      const coberturas: CoberturaParaTaxa[] = (estacao.exposicoes ?? [])
        .filter((x) => !x.cancelamento.cancelado)
        .map((x) => ({
          femeaId: x.femeaId,
          inicio: x.dataInicio,
          saiu: x.femea?.status !== StatusAnimal.ATIVO,
        }));
      return {
        id: estacao.id,
        touro: { id: estacao.touroId, brinco: estacao.touro?.brinco ?? null },
        pasto: estacao.pasto?.nome ?? null,
        dataEntrada: estacao.dataEntrada,
        dataSaida: estacao.dataSaida,
        ...calcularTaxaPrenhez(coberturas, diagnosticos),
      };
    });

    // Cada estação tem um touro: a taxa do touro soma as estações dele
    const porTouro = new Map<
      string,
      { touro: { id: string; brinco: string | null }; taxas: TaxaPrenhez[] }
    >();
    for (const estacao of porEstacao) {
      const item = porTouro.get(estacao.touro.id) ?? {
        touro: estacao.touro,
        taxas: [],
      };
      item.taxas.push(estacao);
      porTouro.set(estacao.touro.id, item);
    }

    const coberturasPorSemen = new Map<
      string,
      {
        semen: { id: string; nomeTouro: string | null };
        coberturas: CoberturaParaTaxa[];
      }
    >();
    for (const inseminacao of inseminacoes) {
      const item = coberturasPorSemen.get(inseminacao.semenId) ?? {
        semen: {
          id: inseminacao.semenId,
          nomeTouro: inseminacao.semen?.nomeTouro ?? null,
        },
        coberturas: [],
      };
      item.coberturas.push({
        femeaId: inseminacao.femeaId,
        inicio: inseminacao.data,
        saiu: inseminacao.femea?.status !== StatusAnimal.ATIVO,
      });
      coberturasPorSemen.set(inseminacao.semenId, item);
    }

    const intervalos = calcularIntervalosPartos(
      partos.map((p) => ({ maeId: p.maeId, data: p.data })),
    );
    const brincoDaMae = new Map(
      partos.map((p) => [p.maeId, p.mae?.brinco ?? '']),
    );

    return {
      estacoes: porEstacao,
      touros: [...porTouro.values()].map(({ touro, taxas }) => ({
        touro,
        estacoes: taxas.length,
        ...somarTaxas(taxas),
      })),
      semens: [...coberturasPorSemen.values()]
        .map(({ semen, coberturas }) => ({
          semen,
          ...calcularTaxaPrenhez(coberturas, diagnosticos),
        }))
        .sort((a, b) =>
          (a.semen.nomeTouro ?? '').localeCompare(b.semen.nomeTouro ?? ''),
        ),
      intervaloPartos: {
        mediaRebanhoDias: intervalos.mediaRebanhoDias,
        porMatriz: intervalos.porMatriz
          .map(({ maeId, ...resto }) => ({
            animal: { id: maeId, brinco: brincoDaMae.get(maeId) ?? '' },
            ...resto,
          }))
          .sort((a, b) => b.ultimoIntervaloDias - a.ultimoIntervaloDias),
      },
    };
  }

  // Fêmeas vazias, para decidir nova cobertura ou descarte (FR-030).
  // Lactantes não entram: o status delas é Lactante, não Vazia.
  async vacasVazias(fazendaId: string, hoje = hojeLocal()) {
    const vazias = await this.animalRepository.find({
      where: {
        fazendaId,
        status: StatusAnimal.ATIVO,
        sexo: Sexo.F,
        statusReprodutivo: StatusReprodutivo.VAZIA,
      },
      relations: { pastoAtual: true },
    });
    if (vazias.length === 0) return [];
    const ids = vazias.map((femea) => femea.id);

    const [partos, exposicoes, inseminacoes, diagnosticos] = await Promise.all([
      this.partoRepository.find({ where: { maeId: In(ids) } }),
      this.exposicaoRepository.find({
        where: { femeaId: In(ids), cancelamento: { cancelado: false } },
        relations: { estacao: true },
      }),
      this.inseminacaoRepository.find({
        where: { femeaId: In(ids), cancelamento: { cancelado: false } },
      }),
      this.diagnosticoRepository.find({
        where: { femeaId: In(ids), cancelamento: { cancelado: false } },
      }),
    ]);

    const ultima = (datas: string[]) =>
      datas.length > 0 ? datas.reduce(maiorData) : null;

    return vazias
      .map((femea) => {
        const ultimoParto = ultima(
          partos.filter((p) => p.maeId === femea.id).map((p) => p.data),
        );
        const ultimaCobertura = ultima([
          ...exposicoes
            .filter(
              (x) =>
                x.femeaId === femea.id && !x.estacao?.cancelamento.cancelado,
            )
            .map((x) => x.dataInicio),
          ...inseminacoes
            .filter((i) => i.femeaId === femea.id)
            .map((i) => i.data),
        ]);
        const ultimoDiagnostico = ultima(
          diagnosticos.filter((d) => d.femeaId === femea.id).map((d) => d.data),
        );
        return {
          animal: {
            id: femea.id,
            brinco: femea.brinco,
            categoria: femea.categoria,
          },
          pasto: femea.pastoAtual?.nome ?? null,
          ultimoParto,
          diasDesdeParto: ultimoParto ? diasEntre(ultimoParto, hoje) : null,
          ultimaCobertura,
          ultimoDiagnostico,
        };
      })
      .sort((a, b) =>
        a.animal.brinco.localeCompare(b.animal.brinco, 'pt-BR', {
          numeric: true,
        }),
      );
  }
}
