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

export enum TipoInsumo {
  SILAGEM = 'SILAGEM',
  RACAO = 'RACAO',
  SAL_MINERAL = 'SAL_MINERAL',
  NUCLEO = 'NUCLEO',
  FENO = 'FENO',
  CONCENTRADO = 'CONCENTRADO',
  OUTRO = 'OUTRO',
}

export enum UnidadeBase {
  KG = 'KG',
  LITRO = 'LITRO',
  UNIDADE = 'UNIDADE',
}

// Insumo da alimentação (spec 005, FR-004). O estoque é calculado dos
// movimentos (research R2), sempre na unidade base.
@Entity('insumos')
@Index(['fazendaId', 'nome'])
export class Insumo extends RegistroAuditado {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Fazenda)
  @JoinColumn({ name: 'fazenda_id' })
  fazenda?: Fazenda;

  @Column({ name: 'fazenda_id', type: 'uuid' })
  fazendaId: string;

  @Column({ type: 'varchar', length: 80 })
  nome: string;

  @Column({ type: 'enum', enum: TipoInsumo })
  tipo: TipoInsumo;

  @Column({ name: 'unidade_base', type: 'enum', enum: UnidadeBase })
  unidadeBase: UnidadeBase;

  @Column({ name: 'unidade_compra_id', type: 'uuid', nullable: true })
  unidadeCompraId: string | null;

  @Column({
    name: 'estoque_minimo_base',
    type: 'decimal',
    precision: 14,
    scale: 3,
    nullable: true,
    transformer: decimalParaNumero,
  })
  estoqueMinimoBase: number | null;

  @Column({ default: true })
  ativo: boolean;

  @OneToMany(() => UnidadeInsumo, (unidade) => unidade.insumo)
  unidades?: UnidadeInsumo[];
}

// Unidade de lançamento com o fator para a base (FR-004a). O fator de uma
// unidade usada não muda (FR-004b).
@Entity('unidades_insumo')
@Index(['insumoId', 'nome'], { unique: true })
export class UnidadeInsumo extends RegistroAuditado {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Insumo, (insumo) => insumo.unidades)
  @JoinColumn({ name: 'insumo_id' })
  insumo?: Insumo;

  @Column({ name: 'insumo_id', type: 'uuid' })
  insumoId: string;

  @Column({ type: 'varchar', length: 30 })
  nome: string;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 4,
    transformer: decimalParaNumero,
  })
  fator: number;

  @Column({ default: true })
  ativa: boolean;
}
