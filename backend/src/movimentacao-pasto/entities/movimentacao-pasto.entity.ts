import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Animal } from '../../animal/entities/animal.entity';
import { Pasto } from '../../pasto/entities/pasto.entity';
import { Usuario } from '../../usuario/entities/usuario.entity';

@Entity('movimentacoes_pasto')
export class MovimentacaoPasto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Animal)
  @JoinColumn({ name: 'animal_id' })
  animal: Animal;

  @Column({ name: 'animal_id' })
  animalId: string;

  @ManyToOne(() => Pasto)
  @JoinColumn({ name: 'pasto_id' })
  pasto: Pasto;

  @Column({ name: 'pasto_id' })
  pastoId: string;

  @Column({ name: 'data_entrada', type: 'date' })
  dataEntrada: string;

  @Column({ name: 'data_saida', type: 'date', nullable: true })
  dataSaida: string | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'criado_por' })
  criadoPor?: Usuario;

  @Column({ name: 'criado_por', type: 'uuid', nullable: true })
  criadoPorId: string | null;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm: Date;
}