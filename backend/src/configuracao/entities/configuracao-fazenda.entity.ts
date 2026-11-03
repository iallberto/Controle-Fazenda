import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Fazenda } from '../../fazenda/entities/fazenda.entity';
import { ValorArrobaCategoria } from './valor-arroba-categoria.entity';

// Som tocado ao confirmar um registro (M14). Os sons são gerados no navegador.
export enum SomNotificacao {
  SINO = 'SINO',
  BIPE = 'BIPE',
  DUPLO = 'DUPLO',
}

@Entity('configuracoes_fazenda')
export class ConfiguracaoFazenda {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Fazenda)
  @JoinColumn({ name: 'fazenda_id' })
  fazenda: Fazenda;

  @Column({ name: 'fazenda_id', unique: true })
  fazendaId: string;

  @Column({ name: 'notificacoes_ativas', default: true })
  notificacoesAtivas: boolean;

  @Column({ name: 'som_ativo', default: true })
  somAtivo: boolean;

  @Column({ type: 'enum', enum: SomNotificacao, default: SomNotificacao.SINO })
  som: SomNotificacao;

  @OneToMany(() => ValorArrobaCategoria, (v) => v.configuracaoFazenda)
  valoresArroba: ValorArrobaCategoria[];
}