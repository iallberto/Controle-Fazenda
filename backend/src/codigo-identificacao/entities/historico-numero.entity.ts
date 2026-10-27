import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Fazenda } from '../../fazenda/entities/fazenda.entity';
import { Animal } from '../../animal/entities/animal.entity';
import { Usuario } from '../../usuario/entities/usuario.entity';

@Entity('historico_numero')
@Index(['fazendaId', 'numeroAnterior'])
export class HistoricoNumero {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Fazenda)
  @JoinColumn({ name: 'fazenda_id' })
  fazenda: Fazenda;

  @Column({ name: 'fazenda_id' })
  fazendaId: string;

  @ManyToOne(() => Animal)
  @JoinColumn({ name: 'animal_id' })
  animal: Animal;

  @Column({ name: 'animal_id' })
  animalId: string;

  @Column({ name: 'numero_anterior' })
  numeroAnterior: string;

  @Column({ name: 'numero_novo' })
  numeroNovo: string;

  @Column({ type: 'varchar', nullable: true })
  motivo: string | null;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'reemitido_por' })
  reemitidoPor: Usuario;

  @Column({ name: 'reemitido_por' })
  reemitidoPorId: string;

  @CreateDateColumn({ name: 'reemitido_em' })
  reemitidoEm: Date;
}