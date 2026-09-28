import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Fazenda } from '../../fazenda/entities/fazenda.entity';
import { Raca } from '../../raca/entities/raca.entity';
import { Pasto } from '../../pasto/entities/pasto.entity';

export enum Sexo {
  M = 'M',
  F = 'F',
}

export enum CategoriaAnimal {
  BEZERRO = 'BEZERRO',
  NOVILHA = 'NOVILHA',
  MATRIZ = 'MATRIZ',
  TOURO = 'TOURO',
}

export enum StatusAnimal {
  ATIVO = 'ATIVO',
  VENDIDO = 'VENDIDO',
  MORTO = 'MORTO',
  DESCARTADO = 'DESCARTADO',
}

export enum StatusReprodutivo {
  PRENHE = 'PRENHA',
  LACTANTE = 'LACTANTE',
  VAZIA = 'VAZIA',
}

export enum OrigemAnimal {
  NASCIDO_FAZENDA = 'NASCIDO_FAZENDA',
  COMPRADO = 'COMPRADO',
}

@Entity('animais')
@Unique(['fazendaId', 'brinco'])
export class Animal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Fazenda)
  @JoinColumn({ name: 'fazenda_id' })
  fazenda: Fazenda;

  @Column({ name: 'fazenda_id' })
  fazendaId: string;

  @Column()
  brinco: string;

  @Column({ type: 'enum', enum: Sexo })
  sexo: Sexo;

  @Column({ type: 'enum', enum: CategoriaAnimal })
  categoria: CategoriaAnimal;

  @Column({ type: 'enum', enum: StatusAnimal, default: StatusAnimal.ATIVO })
  status: StatusAnimal;

  @Column({
    name: 'status_reprodutivo',
    type: 'enum',
    enum: StatusReprodutivo,
    nullable: true,
  })
  statusReprodutivo: StatusReprodutivo | null;

  @Column({ type: 'enum', enum: OrigemAnimal })
  origem: OrigemAnimal;

  @Column({ name: 'data_nascimento', type: 'date' })
  dataNascimento: string;

  @ManyToOne(() => Raca, { nullable: true })
  @JoinColumn({ name: 'raca_id' })
  raca?: Raca;

  @Column({ name: 'raca_id', type: 'uuid', nullable: true })
  racaId: string | null;

  @ManyToOne(() => Animal, { nullable: true })
  @JoinColumn({ name: 'mae_id' })
  mae?: Animal;

  @Column({ name: 'mae_id', type: 'uuid', nullable: true })
  maeId: string | null;

  @ManyToOne(() => Animal, { nullable: true })
  @JoinColumn({ name: 'pai_id' })
  pai?: Animal;

  @Column({ name: 'pai_id', type: 'uuid', nullable: true })
  paiId: string | null;

  @ManyToOne(() => Pasto, { nullable: true })
  @JoinColumn({ name: 'pasto_atual_id' })
  pastoAtual?: Pasto;

  @Column({ name: 'pasto_atual_id', type: 'uuid', nullable: true })
  pastoAtualId: string | null;

  @Column({ name: 'caracteristicas_visuais', type: 'text', nullable: true })
  caracteristicasVisuais: string | null;

  @Column({ name: 'data_compra', type: 'date', nullable: true })
  dataCompra: string | null;

  @Column({ nullable: true, type: 'varchar' })
  procedencia: string | null;

  @Column({ name: 'motivo_status', nullable: true, type: 'varchar' })
  motivoStatus: string | null;

  @Column({ name: 'data_status', type: 'date', nullable: true })
  dataStatus: string | null;
}