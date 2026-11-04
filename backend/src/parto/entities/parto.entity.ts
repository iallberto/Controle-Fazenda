import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Animal } from '../../animal/entities/animal.entity';
import { Usuario } from '../../usuario/entities/usuario.entity';
import { Inseminacao } from '../../reproducao/entities/inseminacao.entity';
import { PartoCandidatoPai } from '../../reproducao/entities/parto-candidato-pai.entity';

export enum ResultadoParto {
  VIVO = 'VIVO',
  NATIMORTO = 'NATIMORTO',
}

export enum TipoParto {
  NORMAL = 'NORMAL',
  ASSISTIDO = 'ASSISTIDO',
}

@Entity('partos')
export class Parto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Animal)
  @JoinColumn({ name: 'mae_id' })
  mae: Animal;

  @Column({ name: 'mae_id' })
  maeId: string;

  @Column({ type: 'date' })
  data: string;

  @Column({ type: 'enum', enum: ResultadoParto })
  resultado: ResultadoParto;

  @Column({ type: 'enum', enum: TipoParto })
  tipo: TipoParto;

  @Column({ type: 'text', nullable: true })
  observacoes: string | null;

  @OneToMany(() => Animal, (animal) => animal.parto)
  crias: Animal[];

  // Inseminação que originou o parto, quando houver (research R6)
  @ManyToOne(() => Inseminacao, { nullable: true })
  @JoinColumn({ name: 'inseminacao_id' })
  inseminacao?: Inseminacao;

  @Column({ name: 'inseminacao_id', type: 'uuid', nullable: true })
  inseminacaoId: string | null;

  // Possíveis pais gravados no momento do parto
  @OneToMany(() => PartoCandidatoPai, (candidato) => candidato.parto)
  candidatos?: PartoCandidatoPai[];

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'criado_por' })
  criadoPor: Usuario;

  @Column({ name: 'criado_por' })
  criadoPorId: string;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm: Date;

  // Auditoria (M8): quem fez a última alteração e quando
  @UpdateDateColumn({ name: 'atualizado_em' })
  atualizadoEm: Date;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'atualizado_por' })
  atualizadoPor?: Usuario;

  @Column({ name: 'atualizado_por', type: 'uuid', nullable: true })
  atualizadoPorId: string | null;
}