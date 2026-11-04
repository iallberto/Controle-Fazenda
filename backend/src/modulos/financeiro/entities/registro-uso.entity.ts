import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Fazenda } from '../../../fazenda/entities/fazenda.entity';
import { Animal } from '../../../animal/entities/animal.entity';
import { Pasto } from '../../../pasto/entities/pasto.entity';
import { RegistroAuditado } from '../../../common/registro-auditado';
import { CategoriaFinanceira } from './categoria-financeira.entity';

export enum SituacaoUso {
  AGUARDANDO = 'AGUARDANDO',
  LANCADO = 'LANCADO',
  DESCARTADO = 'DESCARTADO',
}

// Item usado ou trazido, registrado sem valor (spec 003, US4). O dono informa o
// valor depois e o registro vira despesa, ou descarta com motivo.
@Entity('registros_uso')
export class RegistroUso extends RegistroAuditado {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Fazenda)
  @JoinColumn({ name: 'fazenda_id' })
  fazenda?: Fazenda;

  @Column({ name: 'fazenda_id', type: 'uuid' })
  fazendaId: string;

  @Column({ type: 'date' })
  data: string;

  @Column({ type: 'varchar', length: 120 })
  item: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantidade: string;

  @Column({ type: 'varchar', length: 20 })
  unidade: string;

  @ManyToOne(() => CategoriaFinanceira)
  @JoinColumn({ name: 'categoria_id' })
  categoria?: CategoriaFinanceira;

  @Column({ name: 'categoria_id', type: 'uuid' })
  categoriaId: string;

  @ManyToOne(() => Animal, { nullable: true })
  @JoinColumn({ name: 'animal_id' })
  animal?: Animal;

  @Column({ name: 'animal_id', type: 'uuid', nullable: true })
  animalId: string | null;

  @ManyToOne(() => Pasto, { nullable: true })
  @JoinColumn({ name: 'pasto_id' })
  pasto?: Pasto;

  @Column({ name: 'pasto_id', type: 'uuid', nullable: true })
  pastoId: string | null;

  @Column({ type: 'enum', enum: SituacaoUso, default: SituacaoUso.AGUARDANDO })
  situacao: SituacaoUso;

  @Column({ name: 'lancamento_id', type: 'uuid', nullable: true })
  lancamentoId: string | null;

  @Column({
    name: 'motivo_descarte',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  motivoDescarte: string | null;
}
