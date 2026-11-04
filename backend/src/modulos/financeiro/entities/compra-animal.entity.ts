import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Fazenda } from '../../../fazenda/entities/fazenda.entity';
import { Animal } from '../../../animal/entities/animal.entity';
import { RegistroAuditado } from '../../../common/registro-auditado';

// Compra de um animal (spec 003, FR-016b, FR-016c). Valor 0 = o dono não quis
// lançar; maior que zero gera a despesa em "Compra de animais".
@Entity('compras_animais')
export class CompraAnimal extends RegistroAuditado {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Fazenda)
  @JoinColumn({ name: 'fazenda_id' })
  fazenda?: Fazenda;

  @Column({ name: 'fazenda_id', type: 'uuid' })
  fazendaId: string;

  @OneToOne(() => Animal)
  @JoinColumn({ name: 'animal_id' })
  animal?: Animal;

  @Column({ name: 'animal_id', type: 'uuid', unique: true })
  animalId: string;

  @Column({ name: 'valor_centavos', type: 'integer' })
  valorCentavos: number;

  @Column({ type: 'varchar', length: 120, nullable: true })
  vendedor: string | null;

  @Column({ name: 'lancamento_id', type: 'uuid', nullable: true })
  lancamentoId: string | null;
}
