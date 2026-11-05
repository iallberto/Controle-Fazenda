import { EntityManager } from 'typeorm';
import { ganchosModulos } from '../../common/ganchos-modulos';
import { Insumo, UnidadeInsumo } from './entities/insumo.entity';
import { MotivoMovimento, MovimentoInsumo } from './entities/movimento-insumo.entity';

const quantidade = (valor: number | null | undefined) =>
  Number(valor ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });

// Avisa o Financeiro que uma entrada de COMPRA passou a ter valor (spec 006,
// US2, FR-008; research R4). Produção própria e silo não viram despesa.
export async function avisarCompraValorada(
  manager: EntityManager,
  entrada: MovimentoInsumo,
  usuarioId: string,
) {
  if (entrada.motivo !== MotivoMovimento.COMPRA || !entrada.valorCentavos) return;
  const [insumo, unidade] = await Promise.all([
    manager.findOne(Insumo, { where: { id: entrada.insumoId } }),
    manager.findOne(UnidadeInsumo, { where: { id: entrada.unidadeId } }),
  ]);
  const descricao =
    `${insumo?.nome ?? 'Insumo'} — ${quantidade(entrada.quantidade)} ${unidade?.nome ?? ''}`.trim() +
    (entrada.fornecedor ? ` (${entrada.fornecedor})` : '');
  await ganchosModulos.emitir('nutricaoCompraValorada', manager, {
    fazendaId: entrada.fazendaId,
    entradaId: entrada.id,
    tipoInsumo: insumo?.tipo ?? 'OUTRO',
    categoriaId: insumo?.categoriaDespesaId ?? null,
    data: entrada.data,
    descricao: descricao.slice(0, 200),
    valorCentavos: entrada.valorCentavos,
    caminho: `/modulos/nutricao/insumos/${entrada.insumoId}`,
    usuarioId,
  });
}

// Avisa o Financeiro que a entrada de compra foi cancelada (ou o preço corrigido)
export async function avisarCompraCancelada(
  manager: EntityManager,
  entrada: MovimentoInsumo,
  motivo: string,
  usuarioId: string,
) {
  if (entrada.motivo !== MotivoMovimento.COMPRA) return;
  await ganchosModulos.emitir('nutricaoEntradaCancelada', manager, {
    fazendaId: entrada.fazendaId,
    entradaId: entrada.id,
    motivo,
    usuarioId,
  });
}
