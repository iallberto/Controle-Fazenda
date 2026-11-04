import { Exclude } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

// Dono do software (spec 002, FR-017). Fora das fazendas: não tem fazendaId e
// nunca acessa dados de rebanho. Criado só pelo comando npm run admin:criar.
@Entity('administradores')
export class Administrador {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nome: string;

  @Column({ unique: true })
  email: string;

  @Exclude()
  @Column({ name: 'senha_hash' })
  senhaHash: string;

  @Column({ default: true })
  ativo: boolean;

  @CreateDateColumn({ name: 'criado_em', type: 'timestamptz' })
  criadoEm: Date;
}
