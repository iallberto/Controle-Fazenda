import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Fazenda } from '../../fazenda/entities/fazenda.entity';
import { Exclude } from 'class-transformer';


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

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm: Date;
}