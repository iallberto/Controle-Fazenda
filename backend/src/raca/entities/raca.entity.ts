import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Fazenda } from '../../fazenda/entities/fazenda.entity';
import { Usuario } from '../../usuario/entities/usuario.entity';

@Entity('racas')
export class Raca {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Fazenda, { nullable: true })
  @JoinColumn({ name: 'fazenda_id' })
  fazenda?: Fazenda;

  @Column({ name: 'fazenda_id', type: 'uuid', nullable: true })
  fazendaId: string | null;

  @Column()
  nome: string;

  @Column({ name: 'gestacao_media_dias', type: 'int' })
  gestacaoMediaDias: number;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'criado_por' })
  criadoPor?: Usuario;

  @Column({ name: 'criado_por', type: 'uuid', nullable: true })
  criadoPorId: string | null;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm: Date;
}