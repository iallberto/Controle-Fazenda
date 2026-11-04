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
import { Semen } from './semen.entity';

export enum TipoInseminacao {
  IA = 'IA',
  IATF = 'IATF',
}

@Entity('inseminacoes')
export class Inseminacao extends RegistroAuditado {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Animal)
  @JoinColumn({ name: 'femea_id' })
  femea?: Animal;

  @Column({ name: 'femea_id', type: 'uuid' })
  femeaId: string;

  @Column({ type: 'date' })
  data: string;

  @Column({ type: 'enum', enum: TipoInseminacao })
  tipo: TipoInseminacao;

  @ManyToOne(() => Semen)
  @JoinColumn({ name: 'semen_id' })
  semen?: Semen;

  @Column({ name: 'semen_id', type: 'uuid' })
  semenId: string;

  @Column({ name: 'aplicado_por_tipo', type: 'enum', enum: AplicadoPorTipo })
  aplicadoPorTipo: AplicadoPorTipo;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'aplicado_por_usuario_id' })
  aplicadoPorUsuario?: Usuario;

  @Column({ name: 'aplicado_por_usuario_id', type: 'uuid', nullable: true })
  aplicadoPorUsuarioId: string | null;

  @ManyToOne(() => Veterinario, { nullable: true })
  @JoinColumn({ name: 'aplicado_por_veterinario_id' })
  aplicadoPorVeterinario?: Veterinario;

  @Column({ name: 'aplicado_por_veterinario_id', type: 'uuid', nullable: true })
  aplicadoPorVeterinarioId: string | null;

  @Column(() => Cancelamento, { prefix: false })
  cancelamento: Cancelamento;
}
