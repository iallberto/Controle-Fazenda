import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Animal } from '../../animal/entities/animal.entity';
import { EstacaoMonta } from './estacao-monta.entity';

// Fêmea apta do pasto que ficou de fora da estação, com o motivo
@Entity('excecoes_estacao_monta')
export class ExcecaoEstacao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => EstacaoMonta, (estacao) => estacao.excecoes)
  @JoinColumn({ name: 'estacao_id' })
  estacao?: EstacaoMonta;

  @Column({ name: 'estacao_id', type: 'uuid' })
  estacaoId: string;

  @ManyToOne(() => Animal)
  @JoinColumn({ name: 'femea_id' })
  femea?: Animal;

  @Column({ name: 'femea_id', type: 'uuid' })
  femeaId: string;

  @Column({ type: 'varchar', length: 200 })
  motivo: string;
}
