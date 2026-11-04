import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Animal } from '../../animal/entities/animal.entity';
import { RegistroAuditado } from '../../common/registro-auditado';
import { Cancelamento } from '../../common/cancelamento';
import { EstacaoMonta } from './estacao-monta.entity';

export enum MotivoFimExposicao {
  ESTACAO_ENCERRADA = 'ESTACAO_ENCERRADA',
  SAIU_DO_PASTO = 'SAIU_DO_PASTO',
  SAIU_DO_REBANHO = 'SAIU_DO_REBANHO',
}

// Período em que uma fêmea ficou com o touro de uma estação. Pode terminar
// antes da estação, se a fêmea mudou de pasto ou saiu do rebanho.
@Entity('exposicoes_monta')
export class ExposicaoMonta extends RegistroAuditado {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => EstacaoMonta, (estacao) => estacao.exposicoes)
  @JoinColumn({ name: 'estacao_id' })
  estacao?: EstacaoMonta;

  @Column({ name: 'estacao_id', type: 'uuid' })
  estacaoId: string;

  @ManyToOne(() => Animal)
  @JoinColumn({ name: 'femea_id' })
  femea?: Animal;

  @Column({ name: 'femea_id', type: 'uuid' })
  femeaId: string;

  @Column({ name: 'data_inicio', type: 'date' })
  dataInicio: string;

  // Nulo = ainda exposta
  @Column({ name: 'data_fim', type: 'date', nullable: true })
  dataFim: string | null;

  @Column({
    name: 'motivo_fim',
    type: 'enum',
    enum: MotivoFimExposicao,
    nullable: true,
  })
  motivoFim: MotivoFimExposicao | null;

  @Column(() => Cancelamento, { prefix: false })
  cancelamento: Cancelamento;
}
