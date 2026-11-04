import { EntityManager, In, IsNull, LessThanOrEqual } from 'typeorm';
import { somarDias } from '../../reproducao/dominio/datas';
import {
  Lactacao,
  MotivoFimLactacao,
  OrigemLactacao,
} from './entities/lactacao.entity';
import { CarenciaLeite } from './entities/carencia-leite.entity';
import { Ordenha, TipoOrdenha } from './entities/ordenha.entity';
import { carenciaAte } from './dominio/regras';

// Operações do Leite que rodam na transação de quem chama (ganchos e serviços).

export function lactacaoAberta(manager: EntityManager, animalId: string) {
  return manager.findOne(Lactacao, { where: { animalId, fim: IsNull() } });
}

// Lactação que cobre o dia (início ≤ dia e sem fim ou fim ≥ dia)
export async function lactacaoNaData(
  manager: EntityManager,
  animalId: string,
  dia: string,
) {
  const candidatas = await manager.find(Lactacao, {
    where: { animalId, inicio: LessThanOrEqual(dia) },
    order: { inicio: 'DESC' },
    take: 1,
  });
  const lactacao = candidatas[0];
  if (!lactacao) return null;
  return lactacao.fim === null || lactacao.fim >= dia ? lactacao : null;
}

// Abre a lactação de um parto (R2). Uma lactação aberta mais antiga termina no
// dia anterior (NOVO_PARTO); se a aberta começou no dia do parto ou depois
// (parto lançado com atraso), nada muda.
export async function abrirLactacaoDoParto(
  manager: EntityManager,
  dados: {
    fazendaId: string;
    animalId: string;
    partoId: string;
    data: string;
    usuarioId: string;
  },
) {
  const aberta = await lactacaoAberta(manager, dados.animalId);
  if (aberta) {
    if (aberta.inicio >= dados.data) return null;
    aberta.fim = somarDias(dados.data, -1);
    aberta.motivoFim = MotivoFimLactacao.NOVO_PARTO;
    aberta.atualizadoPorId = dados.usuarioId;
    await manager.save(aberta);
  }
  return manager.save(
    manager.create(Lactacao, {
      fazendaId: dados.fazendaId,
      animalId: dados.animalId,
      inicio: dados.data,
      origem: OrigemLactacao.PARTO,
      partoId: dados.partoId,
      fim: null,
      motivoFim: null,
      criadoPorId: dados.usuarioId,
    }),
  );
}

export async function encerrarLactacao(
  manager: EntityManager,
  lactacao: Lactacao,
  fim: string,
  motivo: MotivoFimLactacao,
  usuarioId: string,
) {
  lactacao.fim = fim;
  lactacao.motivoFim = motivo;
  lactacao.atualizadoPorId = usuarioId;
  return manager.save(lactacao);
}

// Carências das vacas que tocam o intervalo [de, ate]
export async function carenciasDasVacas(
  manager: EntityManager,
  animalIds: string[],
): Promise<Map<string, CarenciaLeite[]>> {
  const resultado = new Map<string, CarenciaLeite[]>();
  if (animalIds.length === 0) return resultado;
  const carencias = await manager.find(CarenciaLeite, {
    where: { animalId: In(animalIds) },
  });
  for (const c of carencias) {
    const lista = resultado.get(c.animalId) ?? [];
    lista.push(c);
    resultado.set(c.animalId, lista);
  }
  return resultado;
}

// Recalcula o descarte das ordenhas da vaca no intervalo (R6), depois que uma
// carência foi criada, trocada ou removida
export async function recalcularDescarte(
  manager: EntityManager,
  animalId: string,
  de: string,
  ate: string,
) {
  const [carencias, ordenhas] = await Promise.all([
    manager.find(CarenciaLeite, { where: { animalId } }),
    manager.find(Ordenha, { where: { animalId, tipo: TipoOrdenha.VACA } }),
  ]);
  for (const ordenha of ordenhas) {
    if (ordenha.data < de || ordenha.data > ate) continue;
    const descarte = carenciaAte(carencias, ordenha.data) !== null;
    if (ordenha.descarte !== descarte) {
      await manager.update(Ordenha, { id: ordenha.id }, { descarte });
    }
  }
}
