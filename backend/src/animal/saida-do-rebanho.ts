import { EntityManager, IsNull } from 'typeorm';
import { Animal, StatusAnimal } from './entities/animal.entity';
import { MovimentacaoPasto } from '../movimentacao-pasto/entities/movimentacao-pasto.entity';
import { encerrarExposicoesPorSaida } from '../reproducao/saida';

// Saída do rebanho (vendido, morto ou descartado), sempre na transação de quem
// chama: fecha a permanência no pasto, tira o animal do pasto e encerra as
// exposições a touro (fêmea) ou a estação (touro). Usada pela mudança de status
// e pela venda do Financeiro (spec 003, research R2).
export async function registrarSaidaDoRebanho(
  manager: EntityManager,
  dados: {
    animal: Animal;
    status: Exclude<StatusAnimal, StatusAnimal.ATIVO>;
    data: string;
    motivo: string;
    usuarioId: string;
  },
): Promise<Animal> {
  const { animal, status, data, motivo, usuarioId } = dados;
  const movimentacaoAberta = await manager.findOne(MovimentacaoPasto, {
    where: { animalId: animal.id, dataSaida: IsNull() },
  });
  if (movimentacaoAberta) {
    movimentacaoAberta.dataSaida = data;
    await manager.save(movimentacaoAberta);
  }

  animal.status = status;
  animal.motivoStatus = motivo;
  animal.dataStatus = data;
  animal.pastoAtualId = null;
  animal.pastoAtual = undefined;
  animal.atualizadoPorId = usuarioId;

  await encerrarExposicoesPorSaida(manager, {
    animalIds: [animal.id],
    data,
    saida: 'REBANHO',
    usuarioId,
  });
  return manager.save(animal);
}

// Volta ao rebanho, quando uma venda é cancelada (spec 003, FR-015): o animal
// fica ativo de novo e, se informado, entra no pasto com uma permanência nova.
// Exposições a touro encerradas na saída não são reabertas.
export async function voltarAoRebanho(
  manager: EntityManager,
  dados: {
    animalId: string;
    pastoId: string | null;
    data: string;
    usuarioId: string;
  },
): Promise<void> {
  const { animalId, pastoId, data, usuarioId } = dados;
  await manager.update(
    Animal,
    { id: animalId },
    {
      status: StatusAnimal.ATIVO,
      motivoStatus: null,
      dataStatus: null,
      pastoAtualId: pastoId,
      atualizadoPorId: usuarioId,
    },
  );
  if (pastoId) {
    await manager.save(
      manager.create(MovimentacaoPasto, {
        animalId,
        pastoId,
        dataEntrada: data,
        dataSaida: null,
        criadoPorId: usuarioId,
      }),
    );
  }
}
