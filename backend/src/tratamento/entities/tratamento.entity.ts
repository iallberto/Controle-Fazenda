import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Animal } from '../../animal/entities/animal.entity';
import { Usuario } from '../../usuario/entities/usuario.entity';
import { Veterinario } from '../../veterinario/entities/veterinario.entity';

export enum AplicadoPorTipo {
  USUARIO = 'USUARIO',
  VETERINARIO = 'VETERINARIO',
}

@Entity('tratamentos')
export class Tratamento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Animal)
  @JoinColumn({ name: 'animal_id' })
  animal: Animal;

  @Column({ name: 'animal_id' })
  animalId: string;

  @Column()
  produto: string;

  @Column({ type: 'date' })
  data: string;

  @Column({ name: 'recorrencia_dias', type: 'int', nullable: true })
  recorrenciaDias: number | null;

  @Column({ name: 'proxima_data_prevista', type: 'date', nullable: true })
  proximaDataPrevista: string | null;

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

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'lancado_por' })
  lancadoPor: Usuario;

  @Column({ name: 'lancado_por' })
  lancadoPorId: string;
}