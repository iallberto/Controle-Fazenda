import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Fazenda } from '../../../fazenda/entities/fazenda.entity';
import { Usuario } from '../../../usuario/entities/usuario.entity';
import { Administrador } from './administrador.entity';

// Sessão de suporte vale 8 horas (spec 008, FR-004)
export const DURACAO_SESSAO_SUPORTE_MS = 8 * 60 * 60 * 1000;

// Entrada do administrador numa fazenda como suporte (spec 008, R1). Só
// inserção e a hora de saída; sem saída e com mais de 8 h = expirada.
@Entity('sessoes_suporte')
@Index(['fazendaId', 'entradaEm'])
export class SessaoSuporte {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Administrador)
  @JoinColumn({ name: 'administrador_id' })
  administrador?: Administrador;

  @Column({ name: 'administrador_id', type: 'uuid' })
  administradorId: string;

  @ManyToOne(() => Fazenda)
  @JoinColumn({ name: 'fazenda_id' })
  fazenda?: Fazenda;

  @Column({ name: 'fazenda_id', type: 'uuid' })
  fazendaId: string;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_id' })
  usuario?: Usuario;

  @Column({ name: 'usuario_id', type: 'uuid' })
  usuarioId: string;

  @CreateDateColumn({ name: 'entrada_em', type: 'timestamptz' })
  entradaEm: Date;

  @Column({ name: 'saida_em', type: 'timestamptz', nullable: true })
  saidaEm: Date | null;
}
