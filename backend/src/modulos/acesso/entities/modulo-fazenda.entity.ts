import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Fazenda } from '../../../fazenda/entities/fazenda.entity';
import { Administrador } from '../../admin/entities/administrador.entity';
import { ModuloPago } from '../modulo-pago';

// Um período de contrato de um módulo para uma fazenda (spec 002, data-model).
// Nunca é apagado: desativar só preenche desativadoEm (FR-008).
@Entity('modulos_fazenda')
@Index(['fazendaId', 'modulo'])
export class ModuloFazenda {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Fazenda)
  @JoinColumn({ name: 'fazenda_id' })
  fazenda?: Fazenda;

  @Column({ name: 'fazenda_id', type: 'uuid' })
  fazendaId: string;

  @Column({ type: 'enum', enum: ModuloPago })
  modulo: ModuloPago;

  @Column({ name: 'data_inicio', type: 'date' })
  dataInicio: string;

  // Só para contrato com prazo; sem teste grátis (D9)
  @Column({ name: 'data_termino', type: 'date', nullable: true })
  dataTermino: string | null;

  @ManyToOne(() => Administrador)
  @JoinColumn({ name: 'liberado_por' })
  liberadoPor?: Administrador;

  @Column({ name: 'liberado_por', type: 'uuid' })
  liberadoPorId: string;

  @CreateDateColumn({ name: 'liberado_em', type: 'timestamptz' })
  liberadoEm: Date;

  @ManyToOne(() => Administrador, { nullable: true })
  @JoinColumn({ name: 'desativado_por' })
  desativadoPor?: Administrador;

  @Column({ name: 'desativado_por', type: 'uuid', nullable: true })
  desativadoPorId: string | null;

  @Column({ name: 'desativado_em', type: 'timestamptz', nullable: true })
  desativadoEm: Date | null;
}
