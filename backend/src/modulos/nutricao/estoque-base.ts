import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { PapelUsuario } from '../../usuario/entities/usuario.entity';
import { Insumo, UnidadeInsumo } from './entities/insumo.entity';

// Operações comuns da Nutrição (estoque e validações), na transação de quem chama.

// Estoque na base de cada insumo da fazenda (research R2), num SQL só
export async function estoques(
  manager: EntityManager,
  fazendaId: string,
): Promise<Map<string, number>> {
  const linhas: { insumo_id: string; estoque: string }[] = await manager.query(
    `SELECT insumo_id,
            SUM(CASE WHEN tipo = 'ENTRADA' THEN quantidade_base ELSE -quantidade_base END) AS estoque
       FROM movimentos_insumo
      WHERE fazenda_id = $1 AND cancelado = false
      GROUP BY insumo_id`,
    [fazendaId],
  );
  return new Map(linhas.map((l) => [l.insumo_id, Math.round(Number(l.estoque) * 1000) / 1000]));
}

// Insumo da fazenda (404 se não for)
export async function buscarInsumo(manager: EntityManager, fazendaId: string, id: string) {
  const insumo = await manager.findOne(Insumo, { where: { id }, relations: { unidades: true } });
  if (!insumo || insumo.fazendaId !== fazendaId) {
    throw new NotFoundException('Insumo não encontrado');
  }
  return insumo;
}

// Unidade ativa do insumo (FR-004a)
export function unidadeDoInsumo(insumo: Insumo, unidadeId: string): UnidadeInsumo {
  const unidade = insumo.unidades?.find((u) => u.id === unidadeId);
  if (!unidade) throw new BadRequestException(`Unidade não pertence ao insumo ${insumo.nome}`);
  if (!unidade.ativa) throw new BadRequestException(`A unidade ${unidade.nome} está desativada`);
  return unidade;
}

export const ehDono = (papel: string) => papel === (PapelUsuario.DONO as string);
