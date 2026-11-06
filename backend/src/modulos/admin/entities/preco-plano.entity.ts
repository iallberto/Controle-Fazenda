import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export enum ItemPlano {
  PACOTE_INICIAL = 'PACOTE_INICIAL',
  LEITE = 'LEITE',
  FINANCEIRO = 'FINANCEIRO',
  NUTRICAO = 'NUTRICAO',
}

// Preço de cada item do plano, editado no painel (spec 008, R5). Valor da
// renovação = pacote inicial + módulos do plano da fazenda.
@Entity('precos_plano')
export class PrecoPlano {
  @PrimaryColumn({ type: 'enum', enum: ItemPlano })
  item: ItemPlano;

  @Column({ name: 'valor_centavos', type: 'int', default: 0 })
  valorCentavos: number;

  @UpdateDateColumn({ name: 'atualizado_em', type: 'timestamptz' })
  atualizadoEm: Date;
}
