import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

// Toda tentativa de login do administrador, certa ou errada (FR-018a).
// Serve ao bloqueio por tentativas e à auditoria.
@Entity('admin_tentativas_login')
@Index(['email', 'criadoEm'])
export class TentativaLoginAdmin {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // O e-mail digitado, exista ou não um administrador com ele
  @Column()
  email: string;

  @Column()
  sucesso: boolean;

  @Column({ type: 'varchar', nullable: true })
  ip: string | null;

  @CreateDateColumn({ name: 'criado_em', type: 'timestamptz' })
  criadoEm: Date;
}
