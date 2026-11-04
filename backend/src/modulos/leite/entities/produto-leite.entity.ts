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

// Medicamento da fazenda com a carência de leite (spec 004, FR-015). Não é
// excluído: desativado some da escolha.
@Entity('produtos_leite')
@Index(['fazendaId', 'nome'])
export class ProdutoLeite extends RegistroAuditado {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Fazenda)
  @JoinColumn({ name: 'fazenda_id' })
  fazenda?: Fazenda;

  @Column({ name: 'fazenda_id', type: 'uuid' })
  fazendaId: string;

  @Column({ type: 'varchar', length: 80 })
  nome: string;

  @Column({ name: 'carencia_leite_dias', type: 'smallint' })
  carenciaLeiteDias: number;

  @Column({ default: true })
  ativo: boolean;
}
