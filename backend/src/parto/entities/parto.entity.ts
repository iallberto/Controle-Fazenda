import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { Animal } from '../../animal/entities/animal.entity';
import { Usuario } from '../../usuario/entities/usuario.entity';

export enum ResultadoParto {
  VIVO = 'VIVO',
  NATIMORTO = 'NATIMORTO',
}

export enum TipoParto {
  NORMAL = 'NORMAL',
  ASSISTIDO = 'ASSISTIDO',
}

@Entity('partos')
export class Parto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Animal)
  @JoinColumn({ name: 'mae_id' })
  mae: Animal;

  @Column({ name: 'mae_id' })
  maeId: string;

  @Column({ type: 'date' })
  data: string;

  @Column({ type: 'enum', enum: ResultadoParto })
  resultado: ResultadoParto;

  @Column({ type: 'enum', enum: TipoParto })
  tipo: TipoParto;

  @Column({ type: 'text', nullable: true })
  observacoes: string | null;

  @OneToMany(() => Animal, (animal) => animal.parto)
  crias: Animal[];

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'criado_por' })
  criadoPor: Usuario;

  @Column({ name: 'criado_por' })
  criadoPorId: string;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm: Date;
}