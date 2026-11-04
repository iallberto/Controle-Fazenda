import { Column } from 'typeorm';

// Registros de reprodução não são excluídos: o dono cancela com motivo e o
// registro fica no histórico, fora dos cálculos (FR-026). Usado como coluna
// embutida: @Column(() => Cancelamento, { prefix: false }).
export class Cancelamento {
  @Column({ default: false })
  cancelado: boolean;

  @Column({ name: 'cancelado_em', type: 'timestamptz', nullable: true })
  canceladoEm: Date | null;

  @Column({ name: 'cancelado_por', type: 'uuid', nullable: true })
  canceladoPorId: string | null;

  @Column({
    name: 'motivo_cancelamento',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  motivoCancelamento: string | null;
}

