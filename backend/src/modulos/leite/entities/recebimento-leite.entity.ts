import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Fazenda } from '../../../fazenda/entities/fazenda.entity';
import { RegistroAuditado } from '../../../common/registro-auditado';
import { Cancelamento } from '../../../common/cancelamento';
import { decimalParaNumero } from '../../../common/decimal';

// Recebimento do leite de um mês, confirmado pelo dono (spec 006, FR-006 a
// FR-007a; research R3). Desfazer = cancelar com motivo.
@Entity('recebimentos_leite')
@Index('UQ_recebimento_mes', ['fazendaId', 'mes'], {
  unique: true,
  where: '"cancelado" = false',
})
export class RecebimentoLeite extends RegistroAuditado {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Fazenda)
  @JoinColumn({ name: 'fazenda_id' })
  fazenda?: Fazenda;

  @Column({ name: 'fazenda_id', type: 'uuid' })
  fazendaId: string;

  @Column({ type: 'char', length: 7 })
  mes: string;

  @Column({ type: 'date' })
  data: string;

  @Column({ type: 'decimal', precision: 10, scale: 1, transformer: decimalParaNumero })
  litros: number;

  @Column({ name: 'total_calculado_centavos', type: 'integer' })
  totalCalculadoCentavos: number;

  @Column({ name: 'valor_recebido_centavos', type: 'integer' })
  valorRecebidoCentavos: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  observacao: string | null;

  @Column(() => Cancelamento, { prefix: false })
  cancelamento: Cancelamento;
}
