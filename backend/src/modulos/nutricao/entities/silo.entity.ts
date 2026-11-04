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
import { decimalParaNumero } from '../../../common/decimal';
import { Insumo } from './insumo.entity';

export enum TipoSilo {
  TRINCHEIRA = 'TRINCHEIRA',
  SUPERFICIE = 'SUPERFICIE',
  BAG = 'BAG',
}

// Silo de silagem (spec 005, FR-016 a FR-019; research R6). Fechado é
// reserva; a abertura lança a entrada de produção própria no estoque.
@Entity('silos')
@Index(['fazendaId', 'nome'])
export class Silo extends RegistroAuditado {
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

  @Column({ type: 'varchar', length: 60 })
  nome: string;

  @Column({ type: 'enum', enum: TipoSilo })
  tipo: TipoSilo;

  @Column({
    name: 'toneladas_ensiladas',
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: decimalParaNumero,
  })
  toneladasEnsiladas: number;

  @Column({ name: 'custo_ensilagem_centavos', type: 'integer', nullable: true })
  custoEnsilagemCentavos: number | null;

  @Column({ type: 'date' })
  fechamento: string;

  @Column({ type: 'date', nullable: true })
  abertura: string | null;

  @Column({ type: 'date', nullable: true })
  encerramento: string | null;

  @Column({ name: 'entrada_id', type: 'uuid', nullable: true })
  entradaId: string | null;
}
