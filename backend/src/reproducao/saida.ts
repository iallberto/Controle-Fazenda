import { EntityManager, In, IsNull } from 'typeorm';
import {
  EstacaoMonta,
  MotivoEncerramento,
} from './entities/estacao-monta.entity';
import {
  ExposicaoMonta,
  MotivoFimExposicao,
} from './entities/exposicao-monta.entity';
import { maiorData } from './dominio/datas';

export interface SaidaDeAnimais {
  animalIds: string[];
  data: string;
  // PASTO: mudou de pasto (informar o destino); REBANHO: vendido, morto ou descartado
  saida: 'PASTO' | 'REBANHO';
  pastoDestinoId?: string;
  usuarioId: string;
}

// Gancho chamado DENTRO das transações que tiram animais de um pasto ou do
// rebanho (mover, mover em lote, mudar status). Fêmea que sai tem a exposição
// encerrada; touro que sai encerra a estação inteira (FR-007, research R7).
export async function encerrarExposicoesPorSaida(
  manager: EntityManager,
  saida: SaidaDeAnimais,
) {
  if (saida.animalIds.length === 0) return;
  const saiuDaquiPasto = (pastoId: string) =>
    saida.saida === 'REBANHO' || pastoId !== saida.pastoDestinoId;

  const exposicoes = await manager.find(ExposicaoMonta, {
    where: {
      femeaId: In(saida.animalIds),
      dataFim: IsNull(),
      cancelamento: { cancelado: false },
    },
    relations: { estacao: true },
  });
  for (const exposicao of exposicoes) {
    if (!exposicao.estacao || !saiuDaquiPasto(exposicao.estacao.pastoId))
      continue;
    await manager.update(
      ExposicaoMonta,
      { id: exposicao.id },
      {
        dataFim: maiorData(saida.data, exposicao.dataInicio),
        motivoFim:
          saida.saida === 'REBANHO'
            ? MotivoFimExposicao.SAIU_DO_REBANHO
            : MotivoFimExposicao.SAIU_DO_PASTO,
        atualizadoPorId: saida.usuarioId,
      },
    );
  }

  const estacoes = await manager.find(EstacaoMonta, {
    where: {
      touroId: In(saida.animalIds),
      dataSaida: IsNull(),
      cancelamento: { cancelado: false },
    },
  });
  for (const estacao of estacoes) {
    if (!saiuDaquiPasto(estacao.pastoId)) continue;
    await fecharEstacao(
      manager,
      estacao,
      maiorData(saida.data, estacao.dataEntrada),
      saida.saida === 'REBANHO'
        ? MotivoEncerramento.TOURO_SAIU_DO_REBANHO
        : MotivoEncerramento.TOURO_SAIU_DO_PASTO,
      saida.usuarioId,
    );
  }
}

// Encerra a estação e todas as exposições ainda abertas dela na mesma data
export async function fecharEstacao(
  manager: EntityManager,
  estacao: EstacaoMonta,
  dataSaida: string,
  motivo: MotivoEncerramento,
  usuarioId: string,
) {
  await manager.update(
    EstacaoMonta,
    { id: estacao.id },
    { dataSaida, motivoEncerramento: motivo, atualizadoPorId: usuarioId },
  );
  const abertas = await manager.find(ExposicaoMonta, {
    where: {
      estacaoId: estacao.id,
      dataFim: IsNull(),
      cancelamento: { cancelado: false },
    },
  });
  for (const exposicao of abertas) {
    await manager.update(
      ExposicaoMonta,
      { id: exposicao.id },
      {
        dataFim: maiorData(dataSaida, exposicao.dataInicio),
        motivoFim: MotivoFimExposicao.ESTACAO_ENCERRADA,
        atualizadoPorId: usuarioId,
      },
    );
  }
}
