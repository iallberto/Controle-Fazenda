import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Fazenda } from '../../../fazenda/entities/fazenda.entity';
import { Animal } from '../../../animal/entities/animal.entity';
import { RegistroAuditado } from '../../../common/registro-auditado';
import { decimalParaNumero } from '../../../common/decimal';
import { Lactacao } from './lactacao.entity';

export enum TipoOrdenha {
  VACA = 'VACA',
  TANQUE = 'TANQUE',
}

// Litros de uma vaca, ou do tanque, num turno do dia (spec 004, FR-009 a
// FR-014; research R5). Gravar substitui (upsert); descarte é calculado no
// servidor pela carência (R6).
@Entity('ordenhas')
@Index('UQ_ordenha_vaca', ['fazendaId', 'data', 'turno', 'animalId'], {
  unique: true,
  where: `"tipo" = 'VACA'`,
})
@Index('UQ_ordenha_tanque', ['fazendaId', 'data', 'turno'], {
  unique: true,
  where: `"tipo" = 'TANQUE'`,
})
@Index(['fazendaId', 'data'])
@Index(['lactacaoId'])
export class Ordenha extends RegistroAuditado {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Fazenda)
  @JoinColumn({ name: 'fazenda_id' })
  fazenda?: Fazenda;

  @Column({ name: 'fazenda_id', type: 'uuid' })
  fazendaId: string;

  @Column({ type: 'date' })
  data: string;

  @Column({ type: 'smallint' })
  turno: number;

  @Column({ type: 'enum', enum: TipoOrdenha })
  tipo: TipoOrdenha;

  @ManyToOne(() => Animal, { nullable: true })
  @JoinColumn({ name: 'animal_id' })
  animal?: Animal;

  @Column({ name: 'animal_id', type: 'uuid', nullable: true })
  animalId: string | null;

  @ManyToOne(() => Lactacao, { nullable: true })
  @JoinColumn({ name: 'lactacao_id' })
  lactacao?: Lactacao;

  @Column({ name: 'lactacao_id', type: 'uuid', nullable: true })
  lactacaoId: string | null;

  @Column({
    type: 'decimal',
    precision: 7,
    scale: 1,
    transformer: decimalParaNumero,
  })
  litros: number;

  @Column({ default: false })
  descarte: boolean;
}
