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
import { EntregaLeite } from './entrega-leite.entity';

// Análise de qualidade mandada pelo laticínio, por mês ou por entrega
// (spec 004, FR-024). CCS e CBT em mil por mL.
@Entity('analises_leite')
@Index(['fazendaId', 'mes'])
export class AnaliseLeite extends RegistroAuditado {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Fazenda)
  @JoinColumn({ name: 'fazenda_id' })
  fazenda?: Fazenda;

  @Column({ name: 'fazenda_id', type: 'uuid' })
  fazendaId: string;

  @Column({ type: 'char', length: 7 })
  mes: string;

  @ManyToOne(() => EntregaLeite, { nullable: true })
  @JoinColumn({ name: 'entrega_id' })
  entrega?: EntregaLeite;

  @Column({ name: 'entrega_id', type: 'uuid', nullable: true })
  entregaId: string | null;

  @Column({ name: 'ccs_mil', type: 'integer', nullable: true })
  ccsMil: number | null;

  @Column({ name: 'cbt_mil', type: 'integer', nullable: true })
  cbtMil: number | null;

  @Column({
    type: 'decimal',
    precision: 4,
    scale: 2,
    nullable: true,
    transformer: decimalParaNumero,
  })
  gordura: number | null;

  @Column({
    type: 'decimal',
    precision: 4,
    scale: 2,
    nullable: true,
    transformer: decimalParaNumero,
  })
  proteina: number | null;

  @Column(() => Cancelamento, { prefix: false })
  cancelamento: Cancelamento;
}
