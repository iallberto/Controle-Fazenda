import {
  Column,
  CreateDateColumn,
  JoinColumn,
  ManyToOne,
  UpdateDateColumn,
} from 'typeorm';
import { Usuario } from '../usuario/entities/usuario.entity';

// Base das entidades novas: quem criou, quem alterou por último e quando
// (constituição, princípio III). As colunas são herdadas pela entidade filha.
export abstract class RegistroAuditado {
  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'criado_por' })
  criadoPor?: Usuario;

  @Column({ name: 'criado_por', type: 'uuid' })
  criadoPorId: string;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm: Date;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'atualizado_por' })
  atualizadoPor?: Usuario;

  @Column({ name: 'atualizado_por', type: 'uuid', nullable: true })
  atualizadoPorId: string | null;

  @UpdateDateColumn({ name: 'atualizado_em' })
  atualizadoEm: Date;
}
