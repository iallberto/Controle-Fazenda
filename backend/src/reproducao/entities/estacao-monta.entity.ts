import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Fazenda } from '../../fazenda/entities/fazenda.entity';
import { Animal } from '../../animal/entities/animal.entity';
import { Pasto } from '../../pasto/entities/pasto.entity';
import { RegistroAuditado } from '../../common/registro-auditado';
import { Cancelamento } from '../../common/cancelamento';
import { ExposicaoMonta } from './exposicao-monta.entity';
import { ExcecaoEstacao } from './excecao-estacao.entity';

export enum MotivoEncerramento {
  MANUAL = 'MANUAL',
  TOURO_SAIU_DO_PASTO = 'TOURO_SAIU_DO_PASTO',
  TOURO_SAIU_DO_REBANHO = 'TOURO_SAIU_DO_REBANHO',
}

// Um touro num pasto durante um período (monta natural). Sempre um touro por
// estação; vários touros no mesmo pasto são várias estações.
@Entity('estacoes_monta')
export class EstacaoMonta extends RegistroAuditado {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Fazenda)
  @JoinColumn({ name: 'fazenda_id' })
  fazenda?: Fazenda;

  @Column({ name: 'fazenda_id', type: 'uuid' })
  fazendaId: string;

  @ManyToOne(() => Animal)
  @JoinColumn({ name: 'touro_id' })
  touro?: Animal;

  @Column({ name: 'touro_id', type: 'uuid' })
  touroId: string;

  @ManyToOne(() => Pasto)
  @JoinColumn({ name: 'pasto_id' })
  pasto?: Pasto;

  @Column({ name: 'pasto_id', type: 'uuid' })
  pastoId: string;

  @Column({ name: 'data_entrada', type: 'date' })
  dataEntrada: string;

  // Nulo = estação aberta
  @Column({ name: 'data_saida', type: 'date', nullable: true })
  dataSaida: string | null;

  @Column({
    name: 'motivo_encerramento',
    type: 'enum',
    enum: MotivoEncerramento,
    nullable: true,
  })
  motivoEncerramento: MotivoEncerramento | null;

  @OneToMany(() => ExposicaoMonta, (exposicao) => exposicao.estacao)
  exposicoes?: ExposicaoMonta[];

  @OneToMany(() => ExcecaoEstacao, (excecao) => excecao.estacao)
  excecoes?: ExcecaoEstacao[];

  @Column(() => Cancelamento, { prefix: false })
  cancelamento: Cancelamento;
}
