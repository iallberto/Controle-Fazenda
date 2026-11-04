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
import { Pasto } from '../../../pasto/entities/pasto.entity';
import { RegistroAuditado } from '../../../common/registro-auditado';
import { Cancelamento } from '../../../common/cancelamento';
import {
  CategoriaFinanceira,
  TipoLancamento,
} from './categoria-financeira.entity';

// De onde veio o lançamento: digitado, ou gerado por venda, compra ou uso
export enum OrigemLancamento {
  MANUAL = 'MANUAL',
  VENDA = 'VENDA',
  COMPRA = 'COMPRA',
  USO = 'USO',
}

// Receita ou despesa (spec 003, US1). Valor em centavos inteiros (research R1).
// Nunca é apagado: o dono corrige ou cancela com motivo (FR-008).
@Entity('lancamentos')
@Index(['fazendaId', 'data'])
export class Lancamento extends RegistroAuditado {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Fazenda)
  @JoinColumn({ name: 'fazenda_id' })
  fazenda?: Fazenda;

  @Column({ name: 'fazenda_id', type: 'uuid' })
  fazendaId: string;

  @Column({ type: 'enum', enum: TipoLancamento })
  tipo: TipoLancamento;

  @Column({ type: 'date' })
  data: string;

  @Column({ name: 'valor_centavos', type: 'integer' })
  valorCentavos: number;

  @ManyToOne(() => CategoriaFinanceira)
  @JoinColumn({ name: 'categoria_id' })
  categoria?: CategoriaFinanceira;

  @Column({ name: 'categoria_id', type: 'uuid' })
  categoriaId: string;

  @Column({ type: 'varchar', length: 200 })
  descricao: string;

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

  @Column({
    type: 'enum',
    enum: OrigemLancamento,
    default: OrigemLancamento.MANUAL,
  })
  origem: OrigemLancamento;

  @Column({ name: 'venda_id', type: 'uuid', nullable: true })
  vendaId: string | null;

  @Column({ name: 'compra_id', type: 'uuid', nullable: true })
  compraId: string | null;

  @Column({ name: 'registro_uso_id', type: 'uuid', nullable: true })
  registroUsoId: string | null;

  @Column(() => Cancelamento, { prefix: false })
  cancelamento: Cancelamento;
}
