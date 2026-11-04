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

// Leite entregue ao laticínio (spec 004, FR-022, FR-023). O preço por litro é
// só do dono (FR-002; research R9).
@Entity('entregas_leite')
@Index(['fazendaId', 'data'])
export class EntregaLeite extends RegistroAuditado {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Fazenda)
  @JoinColumn({ name: 'fazenda_id' })
  fazenda?: Fazenda;

  @Column({ name: 'fazenda_id', type: 'uuid' })
  fazendaId: string;

  @Column({ type: 'date' })
  data: string;

  @Column({
    type: 'decimal',
    precision: 8,
    scale: 1,
    transformer: decimalParaNumero,
  })
  litros: number;

  @Column({ name: 'preco_litro_centavos', type: 'integer', nullable: true })
  precoLitroCentavos: number | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  observacao: string | null;

  @Column(() => Cancelamento, { prefix: false })
  cancelamento: Cancelamento;
}
