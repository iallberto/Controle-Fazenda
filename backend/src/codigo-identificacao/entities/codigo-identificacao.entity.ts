import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Fazenda } from '../../fazenda/entities/fazenda.entity';
import { Animal } from '../../animal/entities/animal.entity';

export enum StatusCodigo {
  DISPONIVEL = 'DISPONIVEL',
  VINCULADO = 'VINCULADO',
  DESATIVADO = 'DESATIVADO',
}

@Entity('codigos_identificacao')
export class CodigoIdentificacao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Fazenda)
  @JoinColumn({ name: 'fazenda_id' })
  fazenda: Fazenda;

  @Column({ name: 'fazenda_id' })
  fazendaId: string;

  @Column({ unique: true })
  codigo: string;

  @Column({ type: 'enum', enum: StatusCodigo, default: StatusCodigo.DISPONIVEL })
  status: StatusCodigo;

  @ManyToOne(() => Animal, { nullable: true })
  @JoinColumn({ name: 'animal_id' })
  animal?: Animal;

  @Column({ name: 'animal_id', type: 'uuid', nullable: true })
  animalId: string | null;

  @CreateDateColumn({ name: 'gerado_em' })
  geradoEm: Date;

  @Column({ name: 'vinculado_em', type: 'timestamp', nullable: true })
  vinculadoEm: Date | null;
}