import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Fazenda } from '../../fazenda/entities/fazenda.entity';

@Entity('racas')
export class Raca {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Fazenda, { nullable: true })
  @JoinColumn({ name: 'fazenda_id' })
  fazenda?: Fazenda;

  @Column({ name: 'fazenda_id', type: 'uuid', nullable: true })
  fazendaId: string | null;

  @Column()
  nome: string;

  @Column({ name: 'gestacao_media_dias', type: 'int' })
  gestacaoMediaDias: number;
}