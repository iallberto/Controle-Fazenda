import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Fazenda } from '../../../fazenda/entities/fazenda.entity';
import { RegistroAuditado } from '../../../common/registro-auditado';
import { Cancelamento } from '../../../common/cancelamento';
import { decimalParaNumero } from '../../../common/decimal';
import { Insumo, UnidadeInsumo } from './insumo.entity';

export enum TipoMovimento {
  ENTRADA = 'ENTRADA',
  BAIXA = 'BAIXA',
}

export enum MotivoMovimento {
  COMPRA = 'COMPRA',
  PRODUCAO = 'PRODUCAO',
  SILO = 'SILO',
  PERDA = 'PERDA',
  ESTRAGO = 'ESTRAGO',
  DOACAO = 'DOACAO',
  OUTRO = 'OUTRO',
  FORNECIMENTO = 'FORNECIMENTO',
}

// Livro de movimentos do estoque (spec 005, FR-005 a FR-009; research R2).
// Estoque = Σ base das entradas − Σ base das baixas não canceladas.
@Entity('movimentos_insumo')
@Index(['fazendaId', 'insumoId', 'data'])
@Index(['siloId'])
@Index(['fornecimentoItemId'])
export class MovimentoInsumo extends RegistroAuditado {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Fazenda)
  @JoinColumn({ name: 'fazenda_id' })
  fazenda?: Fazenda;

  @Column({ name: 'fazenda_id', type: 'uuid' })
  fazendaId: string;

  @ManyToOne(() => Insumo)
  @JoinColumn({ name: 'insumo_id' })
  insumo?: Insumo;

  @Column({ name: 'insumo_id', type: 'uuid' })
  insumoId: string;

  @Column({ type: 'date' })
  data: string;

  @Column({ type: 'enum', enum: TipoMovimento })
  tipo: TipoMovimento;

  @Column({ type: 'enum', enum: MotivoMovimento })
  motivo: MotivoMovimento;

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

  @Column({ name: 'valor_centavos', type: 'integer', nullable: true })
  valorCentavos: number | null;

  @Column({ name: 'aguardando_preco', default: false })
  aguardandoPreco: boolean;

  @Column({ type: 'varchar', length: 120, nullable: true })
  fornecedor: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  observacao: string | null;

  @Column({ name: 'silo_id', type: 'uuid', nullable: true })
  siloId: string | null;

  @Column({ name: 'fornecimento_item_id', type: 'uuid', nullable: true })
  fornecimentoItemId: string | null;

  @Column(() => Cancelamento, { prefix: false })
  cancelamento: Cancelamento;
}
