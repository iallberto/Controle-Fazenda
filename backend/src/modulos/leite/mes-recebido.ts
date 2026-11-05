import { ConflictException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { RecebimentoLeite } from './entities/recebimento-leite.entity';

// Trava das entregas de mês recebido (FR-007): 409 MES_RECEBIDO
export async function garantirMesAberto(manager: EntityManager, fazendaId: string, datas: string[]) {
  const meses = [...new Set(datas.map((d) => d.slice(0, 7)))];
  for (const mes of meses) {
    const recebido = await manager.findOne(RecebimentoLeite, {
      where: { fazendaId, mes, cancelamento: { cancelado: false } },
    });
    if (recebido) {
      throw new ConflictException({
        codigo: 'MES_RECEBIDO',
        message: 'O leite deste mês já foi recebido: desfaça o recebimento para corrigir',
      });
    }
  }
}
