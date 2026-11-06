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
import type { ModuloPago } from '../../acesso/modulo-pago';
import { Administrador } from './administrador.entity';

export enum TipoRegistroAcesso {
  TESTE = 'TESTE',
  PAGAMENTO = 'PAGAMENTO',
  EXTENSAO = 'EXTENSAO',
  SEM_PRAZO = 'SEM_PRAZO',
}

// Histórico do prazo de acesso da fazenda (spec 008): teste, pagamentos,
// extensões e "sem prazo". Só inserção.
@Entity('registros_acesso')
@Index(['fazendaId', 'criadoEm'])
export class RegistroAcesso {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Fazenda)
  @JoinColumn({ name: 'fazenda_id' })
  fazenda?: Fazenda;

  @Column({ name: 'fazenda_id', type: 'uuid' })
  fazendaId: string;

  @Column({ type: 'enum', enum: TipoRegistroAcesso })
  tipo: TipoRegistroAcesso;

  // Fim anterior e novo fim do prazo
  @Column({ type: 'date', nullable: true })
  de: string | null;

  @Column({ type: 'date', nullable: true })
  ate: string | null;

  @Column({ type: 'simple-array', default: '' })
  modulos: ModuloPago[];

  // Só nos pagamentos
  @Column({ name: 'valor_centavos', type: 'int', nullable: true })
  valorCentavos: number | null;

  @ManyToOne(() => Administrador)
  @JoinColumn({ name: 'administrador_id' })
  administrador?: Administrador;

  @Column({ name: 'administrador_id', type: 'uuid' })
  administradorId: string;

  @CreateDateColumn({ name: 'criado_em', type: 'timestamptz' })
  criadoEm: Date;
}
