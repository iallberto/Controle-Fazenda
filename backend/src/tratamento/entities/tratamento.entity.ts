import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Animal } from '../../animal/entities/animal.entity';

@Entity('tratamentos')
export class Tratamento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Animal)
  @JoinColumn({ name: 'animal_id' })
  animal: Animal;

  @Column({ name: 'animal_id' })
  animalId: string;

  @Column()
  produto: string;

  @Column({ type: 'date' })
  data: string;

  @Column()
  responsavel: string;

  @Column({ name: 'recorrencia_dias', type: 'int', nullable: true })
  recorrenciaDias: number | null;

  @Column({ name: 'proxima_data_prevista', type: 'date', nullable: true })
  proximaDataPrevista: string | null;
}