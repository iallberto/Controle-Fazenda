import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

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
}