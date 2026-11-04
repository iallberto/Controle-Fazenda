import { EntityManager } from 'typeorm';
import { Raca } from '../raca/entities/raca.entity';
import { ExposicaoMonta } from './entities/exposicao-monta.entity';
import { Inseminacao } from './entities/inseminacao.entity';
import { encontrarCandidatosPai } from './dominio/candidatos-pai';

// Busca as coberturas válidas da mãe e devolve os possíveis pais de uma cria
// nascida na data (research R6). Roda na transação de quem chama (o parto).
export async function buscarCandidatosPai(
  manager: EntityManager,
  mae: { id: string; racaId: string | null },
  dataParto: string,
) {
  const [exposicoes, inseminacoes, raca] = await Promise.all([
    manager.find(ExposicaoMonta, {
      where: { femeaId: mae.id, cancelamento: { cancelado: false } },
      relations: { estacao: { touro: true } },
    }),
    manager.find(Inseminacao, {
      where: { femeaId: mae.id, cancelamento: { cancelado: false } },
      relations: { semen: true },
    }),
    mae.racaId ? manager.findOneBy(Raca, { id: mae.racaId }) : null,
  ]);
  const validas = exposicoes.filter(
    (exposicao) =>
      exposicao.estacao && !exposicao.estacao.cancelamento.cancelado,
  );

  const resultado = encontrarCandidatosPai({
    dataParto,
    gestacaoMediaDias: raca?.gestacaoMediaDias,
    exposicoes: validas.map((exposicao) => ({
      touroId: exposicao.estacao!.touroId,
      dataInicio: exposicao.dataInicio,
      dataFim: exposicao.dataFim,
    })),
    inseminacoes: inseminacoes.map((inseminacao) => ({
      id: inseminacao.id,
      semenId: inseminacao.semenId,
      data: inseminacao.data,
    })),
  });

  return {
    ...resultado,
    touros: resultado.touroIds.map((id) => ({
      id,
      brinco:
        validas.find((e) => e.estacao!.touroId === id)?.estacao?.touro
          ?.brinco ?? null,
    })),
    semens: resultado.semenIds.map((id) => ({
      id,
      nomeTouro:
        inseminacoes.find((i) => i.semenId === id)?.semen?.nomeTouro ?? null,
    })),
  };
}
