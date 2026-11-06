import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
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

  @Column({ default: true })
  ativo: boolean;

  // Senha provisória (redefinida pelo dono ou pelo administrador): só a troca de
  // senha é aceita até ele criar uma nova (spec 007, FR-004)
  @Column({ name: 'precisa_trocar_senha', default: false })
  precisaTrocarSenha: boolean;

  // Usuário do acesso de suporte (spec 008, R1): um por administrador e fazenda,
  // papel DONO, não entra por senha e fica fora das listas e contagens
  @Column({ default: false })
  suporte: boolean;

  // Tokens emitidos antes desta hora deixam de valer (spec 007, FR-005)
  @Column({ name: 'senha_alterada_em', type: 'timestamptz', nullable: true })
  senhaAlteradaEm: Date | null;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm: Date;

  // Auditoria (M8): quem fez a última alteração e quando
  @UpdateDateColumn({ name: 'atualizado_em' })
  atualizadoEm: Date;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'atualizado_por' })
  atualizadoPor?: Usuario;

  @Column({ name: 'atualizado_por', type: 'uuid', nullable: true })
  atualizadoPorId: string | null;
}