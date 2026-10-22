import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  CreateDateColumn,
} from 'typeorm';
import { Fazenda } from '../../fazenda/entities/fazenda.entity';
import { Usuario } from '../../usuario/entities/usuario.entity';

@Entity('pastos')
@Unique(['fazendaId', 'nome'])
export class Pasto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Fazenda)
  @JoinColumn({ name: 'fazenda_id' })
  fazenda: Fazenda;

  @Column({ name: 'fazenda_id' })
  fazendaId: string;

  @Column()
  nome: string;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'criado_por' })
  criadoPor: Usuario;

  @Column({ name: 'criado_por' })
  criadoPorId: string;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm: Date;
}