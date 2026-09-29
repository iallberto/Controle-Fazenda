import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { ConfiguracaoFazenda } from './configuracao-fazenda.entity';
import { CategoriaAnimal } from '../../animal/entities/animal.entity';

@Entity('valores_arroba_categoria')
@Unique(['configuracaoFazendaId', 'categoria'])
export class ValorArrobaCategoria {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ConfiguracaoFazenda, (c) => c.valoresArroba)
  @JoinColumn({ name: 'configuracao_fazenda_id' })
  configuracaoFazenda: ConfiguracaoFazenda;

  @Column({ name: 'configuracao_fazenda_id' })
  configuracaoFazendaId: string;

  @Column({ type: 'enum', enum: CategoriaAnimal })
  categoria: CategoriaAnimal;

  @Column({ name: 'peso_referencia_kg', type: 'decimal', precision: 5, scale: 2 })
  pesoReferenciaKg: number;
}