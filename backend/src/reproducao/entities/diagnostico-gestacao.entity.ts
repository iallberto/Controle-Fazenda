import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Animal } from '../../animal/entities/animal.entity';
import { Usuario } from '../../usuario/entities/usuario.entity';
import { Veterinario } from '../../veterinario/entities/veterinario.entity';
import { AplicadoPorTipo } from '../../tratamento/entities/tratamento.entity';
import { RegistroAuditado } from '../../common/registro-auditado';
import { Cancelamento } from '../../common/cancelamento';

export enum ResultadoDiagnostico {
  PRENHE = 'PRENHE',
  VAZIA = 'VAZIA',
  // Perda de gestação de uma fêmea que estava prenhe (FR-016)
  PERDA = 'PERDA',
}

export enum MetodoDiagnostico {
  TOQUE = 'TOQUE',
  ULTRASSOM = 'ULTRASSOM',
}

@Entity('diagnosticos_gestacao')
export class DiagnosticoGestacao extends RegistroAuditado {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Animal)
  @JoinColumn({ name: 'femea_id' })
  femea?: Animal;

  @Column({ name: 'femea_id', type: 'uuid' })
  femeaId: string;

  @Column({ type: 'date' })
  data: string;

  @Column({ type: 'enum', enum: ResultadoDiagnostico })
  resultado: ResultadoDiagnostico;

  // Obrigatório quando o resultado não é PERDA
  @Column({ type: 'enum', enum: MetodoDiagnostico, nullable: true })
  metodo: MetodoDiagnostico | null;

  // Só com PRENHE; a tela informa em meses e dias (30 dias por mês)
  @Column({ name: 'idade_gestacional_dias', type: 'int', nullable: true })
  idadeGestacionalDias: number | null;

  // Obrigatório com PERDA
  @Column({ type: 'varchar', length: 200, nullable: true })
  motivo: string | null;

  @Column({ name: 'feito_por_tipo', type: 'enum', enum: AplicadoPorTipo })
  feitoPorTipo: AplicadoPorTipo;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'feito_por_usuario_id' })
  feitoPorUsuario?: Usuario;

  @Column({ name: 'feito_por_usuario_id', type: 'uuid', nullable: true })
  feitoPorUsuarioId: string | null;

  @ManyToOne(() => Veterinario, { nullable: true })
  @JoinColumn({ name: 'feito_por_veterinario_id' })
  feitoPorVeterinario?: Veterinario;

  @Column({ name: 'feito_por_veterinario_id', type: 'uuid', nullable: true })
  feitoPorVeterinarioId: string | null;

  // Preenchido quando veio do diagnóstico em lote
  @Column({ name: 'sessao_id', type: 'uuid', nullable: true })
  sessaoId: string | null;

  @Column(() => Cancelamento, { prefix: false })
  cancelamento: Cancelamento;
}
