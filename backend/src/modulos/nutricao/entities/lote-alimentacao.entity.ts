import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Fazenda } from '../../../fazenda/entities/fazenda.entity';
import { Animal } from '../../../animal/entities/animal.entity';
import { Usuario } from '../../../usuario/entities/usuario.entity';
import { RegistroAuditado } from '../../../common/registro-auditado';
import { Dieta } from './dieta.entity';

// Lote de alimentação com nome (spec 005, FR-010a; research R4). Não muda o
// pasto do animal.
@Entity('lotes_alimentacao')
@Index(['fazendaId', 'nome'])
export class LoteAlimentacao extends RegistroAuditado {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Fazenda)
  @JoinColumn({ name: 'fazenda_id' })
  fazenda?: Fazenda;

  @Column({ name: 'fazenda_id', type: 'uuid' })
  fazendaId: string;

  @Column({ type: 'varchar', length: 60 })
  nome: string;

  @ManyToOne(() => Dieta, { nullable: true })
  @JoinColumn({ name: 'dieta_id' })
  dieta?: Dieta | null;

  @Column({ name: 'dieta_id', type: 'uuid', nullable: true })
  dietaId: string | null;

  @Column({ default: true })
  ativo: boolean;

  @OneToMany(() => LoteAnimal, (membro) => membro.lote)
  animais?: LoteAnimal[];
}

// Participação do animal no lote: no lote na data D se entrada ≤ D e (saída
// nula ou saída > D). No máximo uma aberta por animal.
@Entity('lote_animais')
@Index('UQ_lote_animal_aberto', ['animalId'], {
  unique: true,
  where: '"saida" IS NULL',
})
@Index(['loteId'])
export class LoteAnimal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => LoteAlimentacao, (lote) => lote.animais)
  @JoinColumn({ name: 'lote_id' })
  lote?: LoteAlimentacao;

  @Column({ name: 'lote_id', type: 'uuid' })
  loteId: string;

  @ManyToOne(() => Animal)
  @JoinColumn({ name: 'animal_id' })
  animal?: Animal;

  @Column({ name: 'animal_id', type: 'uuid' })
  animalId: string;

  @Column({ type: 'date' })
  entrada: string;

  @Column({ type: 'date', nullable: true })
  saida: string | null;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'incluido_por' })
  incluidoPor?: Usuario;

  @Column({ name: 'incluido_por', type: 'uuid' })
  incluidoPorId: string;

  @Column({ name: 'retirado_por', type: 'uuid', nullable: true })
  retiradoPorId: string | null;
}
