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
import { Cancelamento } from '../../../common/cancelamento';
import { decimalParaNumero } from '../../../common/decimal';
import { Insumo, UnidadeInsumo } from './insumo.entity';
import { LoteAlimentacao } from './lote-alimentacao.entity';

// Trato de um lote num dia (spec 005, FR-011 a FR-014; research R5). Cada
// item gera uma baixa no estoque, na mesma transação.
@Entity('fornecimentos')
@Index(['fazendaId', 'data'])
@Index(['loteId', 'data'])
export class Fornecimento extends RegistroAuditado {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Fazenda)
  @JoinColumn({ name: 'fazenda_id' })
  fazenda?: Fazenda;

  @Column({ name: 'fazenda_id', type: 'uuid' })
  fazendaId: string;

  @Column({ type: 'date' })
  data: string;

  @ManyToOne(() => LoteAlimentacao)
  @JoinColumn({ name: 'lote_id' })
  lote?: LoteAlimentacao;

  @Column({ name: 'lote_id', type: 'uuid' })
  loteId: string;

  @Column({ type: 'integer' })
  animais: number;

  @Column({ name: 'dieta_id', type: 'uuid', nullable: true })
  dietaId: string | null;

  @Column(() => Cancelamento, { prefix: false })
  cancelamento: Cancelamento;

  @OneToMany(() => ItemFornecimento, (item) => item.fornecimento)
  itens?: ItemFornecimento[];
}

@Entity('itens_fornecimento')
@Index(['fornecimentoId'])
export class ItemFornecimento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Fornecimento, (f) => f.itens)
  @JoinColumn({ name: 'fornecimento_id' })
  fornecimento?: Fornecimento;

  @Column({ name: 'fornecimento_id', type: 'uuid' })
  fornecimentoId: string;

  @ManyToOne(() => Insumo)
  @JoinColumn({ name: 'insumo_id' })
  insumo?: Insumo;

  @Column({ name: 'insumo_id', type: 'uuid' })
  insumoId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, transformer: decimalParaNumero })
  quantidade: number;

  @ManyToOne(() => UnidadeInsumo)
  @JoinColumn({ name: 'unidade_id' })
  unidade?: UnidadeInsumo;

  @Column({ name: 'unidade_id', type: 'uuid' })
  unidadeId: string;

  @Column({
    name: 'quantidade_base',
    type: 'decimal',
    precision: 14,
    scale: 3,
    transformer: decimalParaNumero,
  })
  quantidadeBase: number;

  @Column({ name: 'silo_id', type: 'uuid', nullable: true })
  siloId: string | null;
}
