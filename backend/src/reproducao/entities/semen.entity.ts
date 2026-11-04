import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Fazenda } from '../../fazenda/entities/fazenda.entity';
import { Raca } from '../../raca/entities/raca.entity';
import { RegistroAuditado } from '../../common/registro-auditado';

// Sêmen comprado para inseminação, com as doses em estoque
@Entity('semens')
export class Semen extends RegistroAuditado {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Fazenda)
  @JoinColumn({ name: 'fazenda_id' })
  fazenda?: Fazenda;

  @Column({ name: 'fazenda_id', type: 'uuid' })
  fazendaId: string;

  @Column({ name: 'nome_touro' })
  nomeTouro: string;

  @ManyToOne(() => Raca, { nullable: true })
  @JoinColumn({ name: 'raca_id' })
  raca?: Raca;

  @Column({ name: 'raca_id', type: 'uuid', nullable: true })
  racaId: string | null;

  @Column({ type: 'varchar', nullable: true })
  central: string | null;

  // Nunca negativo: a baixa é atômica (doses > 0) na inseminação
  @Column({ type: 'int', default: 0 })
  doses: number;
}
