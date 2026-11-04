import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Fazenda } from '../../../fazenda/entities/fazenda.entity';
import {
  Animal,
  CategoriaAnimal,
} from '../../../animal/entities/animal.entity';
import { Pasto } from '../../../pasto/entities/pasto.entity';
import { Pesagem } from '../../../pesagem/entities/pesagem.entity';
import { RegistroAuditado } from '../../../common/registro-auditado';
import { Cancelamento } from '../../../common/cancelamento';

export enum FormaPrecoVenda {
  POR_ARROBA = 'POR_ARROBA',
  VALOR_TOTAL = 'VALOR_TOTAL',
}

// Venda de um ou mais animais (spec 003, US2). Gera a receita e tira os
// animais do rebanho na mesma transação (research R4).
@Entity('vendas_animais')
export class VendaAnimais extends RegistroAuditado {
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
  comprador: string;

  @Column({ type: 'enum', enum: FormaPrecoVenda })
  forma: FormaPrecoVenda;

  @Column({ name: 'preco_arroba_centavos', type: 'integer', nullable: true })
  precoArrobaCentavos: number | null;

  @Column({ name: 'valor_total_centavos', type: 'integer' })
  valorTotalCentavos: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  observacao: string | null;

  @OneToMany(() => ItemVenda, (item) => item.venda)
  itens?: ItemVenda[];

  @Column(() => Cancelamento, { prefix: false })
  cancelamento: Cancelamento;
}

// Um animal da venda, com a parte do valor que cabe a ele (research R5)
@Entity('itens_venda')
export class ItemVenda {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => VendaAnimais, (venda) => venda.itens)
  @JoinColumn({ name: 'venda_id' })
  venda?: VendaAnimais;

  @Column({ name: 'venda_id', type: 'uuid' })
  vendaId: string;

  @ManyToOne(() => Animal)
  @JoinColumn({ name: 'animal_id' })
  animal?: Animal;

  @Column({ name: 'animal_id', type: 'uuid' })
  animalId: string;

  // Categoria do animal no dia da venda, para o relatório por categoria
  @Column({ name: 'categoria_na_venda', type: 'enum', enum: CategoriaAnimal })
  categoriaNaVenda: CategoriaAnimal;

  @Column({
    name: 'peso_kg',
    type: 'decimal',
    precision: 6,
    scale: 2,
    nullable: true,
  })
  pesoKg: string | null;

  @Column({ type: 'decimal', precision: 7, scale: 2, nullable: true })
  arrobas: string | null;

  @Column({ name: 'valor_centavos', type: 'integer' })
  valorCentavos: number;

  // Para o cancelamento devolver o animal ao mesmo pasto (FR-015)
  @ManyToOne(() => Pasto, { nullable: true })
  @JoinColumn({ name: 'pasto_anterior_id' })
  pastoAnterior?: Pasto;

  @Column({ name: 'pasto_anterior_id', type: 'uuid', nullable: true })
  pastoAnteriorId: string | null;

  @ManyToOne(() => Pesagem, { nullable: true })
  @JoinColumn({ name: 'pesagem_id' })
  pesagem?: Pesagem;

  @Column({ name: 'pesagem_id', type: 'uuid', nullable: true })
  pesagemId: string | null;
}
