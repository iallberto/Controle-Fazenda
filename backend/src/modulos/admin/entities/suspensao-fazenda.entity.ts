import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Fazenda } from '../../../fazenda/entities/fazenda.entity';
import { Administrador } from './administrador.entity';

// Histórico de suspensões de uma fazenda (FR-025). No máximo uma aberta
// (sem reativadaEm); fazendas.suspensa acompanha, na mesma transação.
@Entity('fazenda_suspensoes')
export class SuspensaoFazenda {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Fazenda)
  @JoinColumn({ name: 'fazenda_id' })
  fazenda?: Fazenda;

  @Column({ name: 'fazenda_id', type: 'uuid' })
  fazendaId: string;

  @Column({ type: 'varchar', length: 200 })
  motivo: string;

  @ManyToOne(() => Administrador)
  @JoinColumn({ name: 'suspensa_por' })
  suspensaPor?: Administrador;

  @Column({ name: 'suspensa_por', type: 'uuid' })
  suspensaPorId: string;

  @CreateDateColumn({ name: 'suspensa_em', type: 'timestamptz' })
  suspensaEm: Date;

  @ManyToOne(() => Administrador, { nullable: true })
  @JoinColumn({ name: 'reativada_por' })
  reativadaPor?: Administrador;

  @Column({ name: 'reativada_por', type: 'uuid', nullable: true })
  reativadaPorId: string | null;

  @Column({ name: 'reativada_em', type: 'timestamptz', nullable: true })
  reativadaEm: Date | null;
}
