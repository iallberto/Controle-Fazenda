import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import type { ModuloPago } from '../../modulos/acesso/modulo-pago';

@Entity('fazendas')
export class Fazenda {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nome: string;

  @CreateDateColumn()
  criadoEm: Date;

  // Suspensa pelo administrador (spec 002, FR-025): ninguém da fazenda entra.
  // Atalho da suspensão aberta em fazenda_suspensoes.
  @Column({ default: false })
  suspensa: boolean;

  // Prazo de acesso (spec 008, R3). Fazendas anteriores à spec ficam sem prazo;
  // as novas nascem aguardando implantação (acessoAte nulo e semPrazo false).
  @Column({ name: 'sem_prazo', default: false })
  semPrazo: boolean;

  // Último dia do teste ou do período pago; depois vêm 2 dias de carência
  @Column({ name: 'acesso_ate', type: 'date', nullable: true })
  acessoAte: string | null;

  // Módulos pagos incluídos no teste e nas renovações (spec 008, R4)
  @Column({ name: 'modulos_plano', type: 'simple-array', default: '' })
  modulosPlano: ModuloPago[];

  // Contato do cliente para cobrança, editado no painel (R9)
  @Column({ name: 'telefone_contato', type: 'varchar', length: 30, nullable: true })
  telefoneContato: string | null;
}
