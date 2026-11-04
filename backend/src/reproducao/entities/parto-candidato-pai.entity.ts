import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Parto } from '../../parto/entities/parto.entity';
import { Animal } from '../../animal/entities/animal.entity';
import { Semen } from './semen.entity';

// Possível pai de uma cria, gravado no momento do parto (research R6).
// Um dos dois é preenchido: touro do rebanho ou sêmen.
@Entity('parto_candidatos_pai')
export class PartoCandidatoPai {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Parto, (parto) => parto.candidatos)
  @JoinColumn({ name: 'parto_id' })
  parto?: Parto;

  @Column({ name: 'parto_id', type: 'uuid' })
  partoId: string;

  @ManyToOne(() => Animal, { nullable: true })
  @JoinColumn({ name: 'touro_id' })
  touro?: Animal;

  @Column({ name: 'touro_id', type: 'uuid', nullable: true })
  touroId: string | null;

  @ManyToOne(() => Semen, { nullable: true })
  @JoinColumn({ name: 'semen_id' })
  semen?: Semen;

  @Column({ name: 'semen_id', type: 'uuid', nullable: true })
  semenId: string | null;
}
