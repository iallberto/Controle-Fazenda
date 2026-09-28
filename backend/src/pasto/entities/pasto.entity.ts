import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Fazenda } from '../../fazenda/entities/fazenda.entity';

@Entity('pastos')
@Unique(['fazendaId', 'nome'])
export class Pasto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Fazenda)
  @JoinColumn({ name: 'fazenda_id' })
  fazenda: Fazenda;

  @Column({ name: 'fazenda_id' })
  fazendaId: string;

  @Column()
  nome: string;
}