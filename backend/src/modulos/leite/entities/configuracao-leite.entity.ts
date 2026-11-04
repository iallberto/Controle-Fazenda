import { Column, Entity, PrimaryColumn } from 'typeorm';
import { RegistroAuditado } from '../../../common/registro-auditado';

export enum ModoOrdenha {
  POR_VACA = 'POR_VACA',
  TANQUE = 'TANQUE',
}

// Configurações do Leite por fazenda (spec 004, FR-009, FR-019; research R8).
// Criada com o padrão na primeira leitura; só o dono altera.
@Entity('configuracoes_leite')
export class ConfiguracaoLeite extends RegistroAuditado {
  @PrimaryColumn({ name: 'fazenda_id', type: 'uuid' })
  fazendaId: string;

  @Column({ type: 'enum', enum: ModoOrdenha, default: ModoOrdenha.POR_VACA })
  modo: ModoOrdenha;

  @Column({ name: 'ordenhas_por_dia', type: 'smallint', default: 2 })
  ordenhasPorDia: number;

  @Column({ name: 'prazo_secagem_dias', type: 'smallint', default: 60 })
  prazoSecagemDias: number;

  @Column({ name: 'janela_secar_dias', type: 'smallint', default: 15 })
  janelaSecarDias: number;
}
