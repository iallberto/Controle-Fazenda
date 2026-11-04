import { EntityManager } from 'typeorm';
import { Animal, StatusReprodutivo } from '../animal/entities/animal.entity';
import { Parto, ResultadoParto } from '../parto/entities/parto.entity';
import {
  DiagnosticoGestacao,
  ResultadoDiagnostico,
} from './entities/diagnostico-gestacao.entity';

// O status reprodutivo vem do evento válido mais recente entre diagnósticos e
// partos (research R3). No mesmo dia, o parto prevalece. Parto com cria viva
// deixa Lactante; natimorto, Vazia (FR-022). Usado por diagnósticos e partos,
// sempre dentro da transação de quem chama.
export async function recalcularStatusReprodutivo(
  manager: EntityManager,
  femeaId: string,
  usuarioId: string,
) {
  const ultimoDiagnostico = await manager.findOne(DiagnosticoGestacao, {
    where: { femeaId, cancelamento: { cancelado: false } },
    order: { data: 'DESC', criadoEm: 'DESC' },
  });
  const ultimoParto = await manager.findOne(Parto, {
    where: { maeId: femeaId },
    order: { data: 'DESC', criadoEm: 'DESC' },
  });

  let status: StatusReprodutivo | null = null;
  if (
    ultimoParto &&
    (!ultimoDiagnostico || ultimoParto.data >= ultimoDiagnostico.data)
  ) {
    status =
      ultimoParto.resultado === ResultadoParto.VIVO
        ? StatusReprodutivo.LACTANTE
        : StatusReprodutivo.VAZIA;
  } else if (ultimoDiagnostico) {
    status =
      ultimoDiagnostico.resultado === ResultadoDiagnostico.PRENHE
        ? StatusReprodutivo.PRENHE
        : StatusReprodutivo.VAZIA;
  }
  await manager.update(
    Animal,
    { id: femeaId },
    { statusReprodutivo: status, atualizadoPorId: usuarioId },
  );
  return status;
}
