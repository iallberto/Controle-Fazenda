import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Fazenda } from '../../../fazenda/entities/fazenda.entity';

export enum TipoLancamento {
  RECEITA = 'RECEITA',
  DESPESA = 'DESPESA',
}

// Códigos das categorias padrão, para o sistema achar as que usa sozinho
// (venda e compra de animais). Inseridas pela migration Financeiro.
export enum CodigoCategoria {
  VENDA_ANIMAIS = 'VENDA_ANIMAIS',
  VENDA_LEITE = 'VENDA_LEITE',
  OUTRAS_RECEITAS = 'OUTRAS_RECEITAS',
  RACAO_SAL = 'RACAO_SAL',
  MEDICAMENTOS = 'MEDICAMENTOS',
  MAO_DE_OBRA = 'MAO_DE_OBRA',
  MANUTENCAO = 'MANUTENCAO',
  COMBUSTIVEL_ENERGIA = 'COMBUSTIVEL_ENERGIA',
  COMPRA_ANIMAIS = 'COMPRA_ANIMAIS',
  OUTRAS_DESPESAS = 'OUTRAS_DESPESAS',
}

// Categoria de receita ou despesa (spec 003, FR-005, FR-006). Sem fazenda =
// padrão do sistema, igual para todas e só leitura.
@Entity('categorias_financeiras')
export class CategoriaFinanceira {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Fazenda, { nullable: true })
  @JoinColumn({ name: 'fazenda_id' })
  fazenda?: Fazenda;

  @Column({ name: 'fazenda_id', type: 'uuid', nullable: true })
  fazendaId: string | null;

  @Column({ type: 'enum', enum: TipoLancamento })
  tipo: TipoLancamento;

  @Column({ type: 'varchar', length: 60 })
  nome: string;

  @Column({ type: 'enum', enum: CodigoCategoria, nullable: true })
  codigo: CodigoCategoria | null;

  @Column({ default: true })
  ativa: boolean;
}
