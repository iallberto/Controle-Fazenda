import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Fazenda } from '../../fazenda/entities/fazenda.entity';

export enum PapelUsuario {
  DONO = 'DONO',
  FUNCIONARIO = 'FUNCIONARIO',
}

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Fazenda)
  @JoinColumn({ name: 'fazenda_id' })
  fazenda: Fazenda;

  @Column({ name: 'fazenda_id' })
  fazendaId: string;

  @Column()
  nome: string;

  @Column({ unique: true })
  email: string;

  @Exclude()
  @Column({ name: 'senha_hash' })
  senhaHash: string;

  @Column({ type: 'enum', enum: PapelUsuario, default: PapelUsuario.FUNCIONARIO })
  papel: PapelUsuario;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'criado_por' })
  criadoPor?: Usuario;

  @Column({ name: 'criado_por', type: 'uuid', nullable: true })
  criadoPorId: string | null;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm: Date;
}