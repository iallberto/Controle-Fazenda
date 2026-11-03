import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Fazenda } from '../../fazenda/entities/fazenda.entity';
import { Usuario } from '../../usuario/entities/usuario.entity';
import { Pasto } from '../../pasto/entities/pasto.entity';
import { CategoriaAnimal } from '../../animal/entities/animal.entity';
import { SessaoManejoExcecao } from './sessao-manejo-excecao.entity';

export enum TipoSessaoManejo {
  TRATAMENTO = 'TRATAMENTO',
  PASTO = 'PASTO',
}

// Uma aplicação em lote (M4): o grupo escolhido (pasto e/ou categoria), a ação
// e quem fez. Os registros individuais (tratamentos, movimentações) apontam para
// a sessão; os animais deixados de fora ficam em SessaoManejoExcecao, com motivo.
@Entity('sessoes_manejo')
export class SessaoManejo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Fazenda)
  @JoinColumn({ name: 'fazenda_id' })
  fazenda: Fazenda;

  @Column({ name: 'fazenda_id' })
  fazendaId: string;

  @Column({ type: 'enum', enum: TipoSessaoManejo })
  tipo: TipoSessaoManejo;

  @ManyToOne(() => Pasto, { nullable: true })
  @JoinColumn({ name: 'filtro_pasto_id' })
  filtroPasto?: Pasto;

  @Column({ name: 'filtro_pasto_id', type: 'uuid', nullable: true })
  filtroPastoId: string | null;

  @Column({
    name: 'filtro_categoria',
    type: 'enum',
    enum: CategoriaAnimal,
    nullable: true,
  })
  filtroCategoria: CategoriaAnimal | null;

  @Column({ type: 'date' })
  data: string;

  // Tratamento: produto aplicado
  @Column({ type: 'varchar', nullable: true })
  produto: string | null;

  // Pasto: para onde o grupo foi movido
  @ManyToOne(() => Pasto, { nullable: true })
  @JoinColumn({ name: 'pasto_destino_id' })
  pastoDestino?: Pasto;

  @Column({ name: 'pasto_destino_id', type: 'uuid', nullable: true })
  pastoDestinoId: string | null;

  @Column({ name: 'total_animais', type: 'int' })
  totalAnimais: number;

  @OneToMany(() => SessaoManejoExcecao, (excecao) => excecao.sessao)
  excecoes: SessaoManejoExcecao[];

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'criado_por' })
  criadoPor: Usuario;

  @Column({ name: 'criado_por' })
  criadoPorId: string;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm: Date;
}
