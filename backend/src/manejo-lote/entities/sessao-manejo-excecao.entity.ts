import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Animal } from '../../animal/entities/animal.entity';
import { SessaoManejo } from './sessao-manejo.entity';

// Animal do grupo que ficou de fora da aplicação em lote, e por quê
@Entity('sessoes_manejo_excecoes')
export class SessaoManejoExcecao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => SessaoManejo, (sessao) => sessao.excecoes)
  @JoinColumn({ name: 'sessao_id' })
  sessao: SessaoManejo;

  @Column({ name: 'sessao_id' })
  sessaoId: string;

  @ManyToOne(() => Animal)
  @JoinColumn({ name: 'animal_id' })
  animal: Animal;

  @Column({ name: 'animal_id' })
  animalId: string;

  @Column()
  motivo: string;
}
