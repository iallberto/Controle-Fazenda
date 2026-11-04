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
import { Parto } from '../../../parto/entities/parto.entity';
import { RegistroAuditado } from '../../../common/registro-auditado';

export enum OrigemLactacao {
  PARTO = 'PARTO',
  MANUAL = 'MANUAL',
}

export enum MotivoFimLactacao {
  SECAGEM = 'SECAGEM',
  SAIDA = 'SAIDA',
  NOVO_PARTO = 'NOVO_PARTO',
}

// Lactação de uma vaca de leite (spec 004, FR-004 a FR-008; research R4).
// Aberta (fim nulo) = em lactação; no máximo uma aberta por vaca.
@Entity('lactacoes')
@Index('UQ_lactacao_aberta', ['animalId'], {
  unique: true,
  where: '"fim" IS NULL',
})
@Index(['fazendaId', 'inicio'])
export class Lactacao extends RegistroAuditado {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Fazenda)
  @JoinColumn({ name: 'fazenda_id' })
  fazenda?: Fazenda;

  @Column({ name: 'fazenda_id', type: 'uuid' })
  fazendaId: string;

  @ManyToOne(() => Animal)
  @JoinColumn({ name: 'animal_id' })
  animal?: Animal;

  @Column({ name: 'animal_id', type: 'uuid' })
  animalId: string;

  @Column({ type: 'date' })
  inicio: string;

  @Column({ type: 'enum', enum: OrigemLactacao })
  origem: OrigemLactacao;

  @ManyToOne(() => Parto, { nullable: true })
  @JoinColumn({ name: 'parto_id' })
  parto?: Parto;

  @Column({ name: 'parto_id', type: 'uuid', nullable: true })
  partoId: string | null;

  @Column({ type: 'date', nullable: true })
  fim: string | null;

  @Column({
    name: 'motivo_fim',
    type: 'enum',
    enum: MotivoFimLactacao,
    nullable: true,
  })
  motivoFim: MotivoFimLactacao | null;
}
