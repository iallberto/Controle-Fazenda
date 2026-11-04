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
import { Lactacao } from './lactacao.entity';

// Secagem que encerrou uma lactação (spec 004, FR-021). Cancelada com motivo,
// reabre a lactação.
@Entity('secagens')
@Index(['lactacaoId'])
export class Secagem extends RegistroAuditado {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Fazenda)
  @JoinColumn({ name: 'fazenda_id' })
  fazenda?: Fazenda;

  @Column({ name: 'fazenda_id', type: 'uuid' })
  fazendaId: string;

  @ManyToOne(() => Lactacao)
  @JoinColumn({ name: 'lactacao_id' })
  lactacao?: Lactacao;

  @Column({ name: 'lactacao_id', type: 'uuid' })
  lactacaoId: string;

  @Column({ type: 'date' })
  data: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  observacao: string | null;

  @Column(() => Cancelamento, { prefix: false })
  cancelamento: Cancelamento;
}
