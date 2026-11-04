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
import { Tratamento } from '../../../tratamento/entities/tratamento.entity';
import { ProdutoLeite } from './produto-leite.entity';

// Prazo de leite em descarte de um tratamento (spec 004, FR-015a, FR-016;
// research R6). A carência é copiada do produto no dia do tratamento.
@Entity('carencias_leite')
@Index(['animalId', 'dataFim'])
export class CarenciaLeite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Fazenda)
  @JoinColumn({ name: 'fazenda_id' })
  fazenda?: Fazenda;

  @Column({ name: 'fazenda_id', type: 'uuid' })
  fazendaId: string;

  @ManyToOne(() => Animal)
  @JoinColumn({ name: 'animal_id' })
  animal?: Animal;

  @Column({ name: 'animal_id', type: 'uuid' })
  animalId: string;

  @ManyToOne(() => Tratamento)
  @JoinColumn({ name: 'tratamento_id' })
  tratamento?: Tratamento;

  @Index({ unique: true })
  @Column({ name: 'tratamento_id', type: 'uuid' })
  tratamentoId: string;

  @ManyToOne(() => ProdutoLeite)
  @JoinColumn({ name: 'produto_id' })
  produto?: ProdutoLeite;

  @Column({ name: 'produto_id', type: 'uuid' })
  produtoId: string;

  @Column({ type: 'date' })
  data: string;

  @Column({ name: 'carencia_dias', type: 'smallint' })
  carenciaDias: number;

  @Column({ name: 'data_fim', type: 'date' })
  dataFim: string;
}
