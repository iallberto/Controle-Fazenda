import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Animal } from '../../animal/entities/animal.entity';
import { Pasto } from '../../pasto/entities/pasto.entity';

@Entity('movimentacoes_pasto')
export class MovimentacaoPasto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Animal)
  @JoinColumn({ name: 'animal_id' })
  animal: Animal;

  @Column({ name: 'animal_id' })
  animalId: string;

  @ManyToOne(() => Pasto)
  @JoinColumn({ name: 'pasto_id' })
  pasto: Pasto;

  @Column({ name: 'pasto_id' })
  pastoId: string;

  @Column({ name: 'data_entrada', type: 'date' })
  dataEntrada: string;

  @Column({ name: 'data_saida', type: 'date', nullable: true })
  dataSaida: string | null;
}