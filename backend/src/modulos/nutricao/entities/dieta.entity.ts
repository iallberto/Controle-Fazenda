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
import { RegistroAuditado } from '../../../common/registro-auditado';
import { decimalParaNumero } from '../../../common/decimal';
import { Insumo, UnidadeInsumo } from './insumo.entity';

// Dieta: quantidade de cada insumo por animal por dia (spec 005, FR-010)
@Entity('dietas')
@Index(['fazendaId', 'nome'])
export class Dieta extends RegistroAuditado {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Fazenda)
  @JoinColumn({ name: 'fazenda_id' })
  fazenda?: Fazenda;

  @Column({ name: 'fazenda_id', type: 'uuid' })
  fazendaId: string;

  @Column({ type: 'varchar', length: 80 })
  nome: string;

  @Column({ default: true })
  ativa: boolean;

  @OneToMany(() => ItemDieta, (item) => item.dieta)
  itens?: ItemDieta[];
}

@Entity('itens_dieta')
@Index(['dietaId', 'insumoId'], { unique: true })
export class ItemDieta {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Dieta, (dieta) => dieta.itens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dieta_id' })
  dieta?: Dieta;

  @Column({ name: 'dieta_id', type: 'uuid' })
  dietaId: string;

  @ManyToOne(() => Insumo)
  @JoinColumn({ name: 'insumo_id' })
  insumo?: Insumo;

  @Column({ name: 'insumo_id', type: 'uuid' })
  insumoId: string;

  @Column({
    name: 'quantidade_por_animal',
    type: 'decimal',
    precision: 12,
    scale: 3,
    transformer: decimalParaNumero,
  })
  quantidadePorAnimal: number;

  @ManyToOne(() => UnidadeInsumo)
  @JoinColumn({ name: 'unidade_id' })
  unidade?: UnidadeInsumo;

  @Column({ name: 'unidade_id', type: 'uuid' })
  unidadeId: string;
}
