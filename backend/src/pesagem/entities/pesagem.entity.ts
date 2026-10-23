import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Animal } from '../../animal/entities/animal.entity';
import { Usuario } from '../../usuario/entities/usuario.entity';

@Entity('pesagens')
export class Pesagem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Animal)
  @JoinColumn({ name: 'animal_id' })
  animal: Animal;

  @Column({ name: 'animal_id' })
  animalId: string;

  @Column({ name: 'peso_kg', type: 'decimal', precision: 6, scale: 2 })
  pesoKg: number;

  @Column({ type: 'date' })
  data: string;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'pesado_por' })
  pesadoPor: Usuario;

  @Column({ name: 'pesado_por' })
  pesadoPorId: string;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'lancado_por' })
  lancadoPor: Usuario;

  @Column({ name: 'lancado_por' })
  lancadoPorId: string;

  @Column({ type: 'text', nullable: true })
  observacao: string | null;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm: Date;
}