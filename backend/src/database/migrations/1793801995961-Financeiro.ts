import { MigrationInterface, QueryRunner } from 'typeorm';

// Módulo Financeiro (spec 003): categorias, lançamentos, vendas de animais,
// compras e registros de uso. Só acrescenta tabelas; no fim, insere as
// categorias padrão do sistema (sem fazenda), cada uma com o seu código.
const CATEGORIAS_PADRAO: [string, string, string][] = [
  ['RECEITA', 'Venda de animais', 'VENDA_ANIMAIS'],
  ['RECEITA', 'Venda de leite', 'VENDA_LEITE'],
  ['RECEITA', 'Outras receitas', 'OUTRAS_RECEITAS'],
  ['DESPESA', 'Ração e sal', 'RACAO_SAL'],
  ['DESPESA', 'Medicamentos e vacinas', 'MEDICAMENTOS'],
  ['DESPESA', 'Mão de obra', 'MAO_DE_OBRA'],
  ['DESPESA', 'Manutenção', 'MANUTENCAO'],
  ['DESPESA', 'Combustível e energia', 'COMBUSTIVEL_ENERGIA'],
  ['DESPESA', 'Compra de animais', 'COMPRA_ANIMAIS'],
  ['DESPESA', 'Outras despesas', 'OUTRAS_DESPESAS'],
];

export class Financeiro1793801995961 implements MigrationInterface {
  name = 'Financeiro1793801995961';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."categorias_financeiras_tipo_enum" AS ENUM('RECEITA', 'DESPESA')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."categorias_financeiras_codigo_enum" AS ENUM('VENDA_ANIMAIS', 'VENDA_LEITE', 'OUTRAS_RECEITAS', 'RACAO_SAL', 'MEDICAMENTOS', 'MAO_DE_OBRA', 'MANUTENCAO', 'COMBUSTIVEL_ENERGIA', 'COMPRA_ANIMAIS', 'OUTRAS_DESPESAS')`,
    );
    await queryRunner.query(
      `CREATE TABLE "categorias_financeiras" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fazenda_id" uuid, "tipo" "public"."categorias_financeiras_tipo_enum" NOT NULL, "nome" character varying(60) NOT NULL, "codigo" "public"."categorias_financeiras_codigo_enum", "ativa" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_f4372eee6477168d6983f4c9044" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "compras_animais" ("criado_por" uuid NOT NULL, "criado_em" TIMESTAMP NOT NULL DEFAULT now(), "atualizado_por" uuid, "atualizado_em" TIMESTAMP NOT NULL DEFAULT now(), "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fazenda_id" uuid NOT NULL, "animal_id" uuid NOT NULL, "valor_centavos" integer NOT NULL, "vendedor" character varying(120), "lancamento_id" uuid, CONSTRAINT "UQ_794edb4ecc6d4f7ad3f1853358d" UNIQUE ("animal_id"), CONSTRAINT "REL_794edb4ecc6d4f7ad3f1853358" UNIQUE ("animal_id"), CONSTRAINT "PK_60eda3c98c3d499188c0e7fc6aa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."lancamentos_tipo_enum" AS ENUM('RECEITA', 'DESPESA')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."lancamentos_origem_enum" AS ENUM('MANUAL', 'VENDA', 'COMPRA', 'USO')`,
    );
    await queryRunner.query(
      `CREATE TABLE "lancamentos" ("criado_por" uuid NOT NULL, "criado_em" TIMESTAMP NOT NULL DEFAULT now(), "atualizado_por" uuid, "atualizado_em" TIMESTAMP NOT NULL DEFAULT now(), "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fazenda_id" uuid NOT NULL, "tipo" "public"."lancamentos_tipo_enum" NOT NULL, "data" date NOT NULL, "valor_centavos" integer NOT NULL, "categoria_id" uuid NOT NULL, "descricao" character varying(200) NOT NULL, "animal_id" uuid, "pasto_id" uuid, "origem" "public"."lancamentos_origem_enum" NOT NULL DEFAULT 'MANUAL', "venda_id" uuid, "compra_id" uuid, "registro_uso_id" uuid, "cancelado" boolean NOT NULL DEFAULT false, "cancelado_em" TIMESTAMP WITH TIME ZONE, "cancelado_por" uuid, "motivo_cancelamento" character varying(200), CONSTRAINT "PK_863ece961e659a6e426dcff9d90" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_08831168bfd13cc7e05a3dba5d" ON "lancamentos"  ("fazenda_id", "data") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."registros_uso_situacao_enum" AS ENUM('AGUARDANDO', 'LANCADO', 'DESCARTADO')`,
    );
    await queryRunner.query(
      `CREATE TABLE "registros_uso" ("criado_por" uuid NOT NULL, "criado_em" TIMESTAMP NOT NULL DEFAULT now(), "atualizado_por" uuid, "atualizado_em" TIMESTAMP NOT NULL DEFAULT now(), "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fazenda_id" uuid NOT NULL, "data" date NOT NULL, "item" character varying(120) NOT NULL, "quantidade" numeric(10,2) NOT NULL, "unidade" character varying(20) NOT NULL, "categoria_id" uuid NOT NULL, "animal_id" uuid, "pasto_id" uuid, "situacao" "public"."registros_uso_situacao_enum" NOT NULL DEFAULT 'AGUARDANDO', "lancamento_id" uuid, "motivo_descarte" character varying(200), CONSTRAINT "PK_5195df61de2088d387e367c10f6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."vendas_animais_forma_enum" AS ENUM('POR_ARROBA', 'VALOR_TOTAL')`,
    );
    await queryRunner.query(
      `CREATE TABLE "vendas_animais" ("criado_por" uuid NOT NULL, "criado_em" TIMESTAMP NOT NULL DEFAULT now(), "atualizado_por" uuid, "atualizado_em" TIMESTAMP NOT NULL DEFAULT now(), "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fazenda_id" uuid NOT NULL, "data" date NOT NULL, "comprador" character varying(120) NOT NULL, "forma" "public"."vendas_animais_forma_enum" NOT NULL, "preco_arroba_centavos" integer, "valor_total_centavos" integer NOT NULL, "observacao" character varying(200), "cancelado" boolean NOT NULL DEFAULT false, "cancelado_em" TIMESTAMP WITH TIME ZONE, "cancelado_por" uuid, "motivo_cancelamento" character varying(200), CONSTRAINT "PK_480e645ef40c7a45c84d80c6dc0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."itens_venda_categoria_na_venda_enum" AS ENUM('BEZERRO', 'NOVILHA', 'MATRIZ', 'GARROTE', 'BOI', 'TOURO')`,
    );
    await queryRunner.query(
      `CREATE TABLE "itens_venda" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "venda_id" uuid NOT NULL, "animal_id" uuid NOT NULL, "categoria_na_venda" "public"."itens_venda_categoria_na_venda_enum" NOT NULL, "peso_kg" numeric(6,2), "arrobas" numeric(7,2), "valor_centavos" integer NOT NULL, "pasto_anterior_id" uuid, "pesagem_id" uuid, CONSTRAINT "PK_724724a6fe4c83c27efd160164f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "categorias_financeiras" ADD CONSTRAINT "FK_caf827804351606842feeb48a97" FOREIGN KEY ("fazenda_id") REFERENCES "fazendas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "compras_animais" ADD CONSTRAINT "FK_f75fe1519ccf9bb9e0b9b24aea9" FOREIGN KEY ("criado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "compras_animais" ADD CONSTRAINT "FK_8c4e804520c18e1252d84e13792" FOREIGN KEY ("atualizado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "compras_animais" ADD CONSTRAINT "FK_35675ae4c4bc2ddad3213a93805" FOREIGN KEY ("fazenda_id") REFERENCES "fazendas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "compras_animais" ADD CONSTRAINT "FK_794edb4ecc6d4f7ad3f1853358d" FOREIGN KEY ("animal_id") REFERENCES "animais"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lancamentos" ADD CONSTRAINT "FK_7858604527aa2efe68c6c3bf79a" FOREIGN KEY ("criado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lancamentos" ADD CONSTRAINT "FK_86636b5c1516ee87fee804ab5cb" FOREIGN KEY ("atualizado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lancamentos" ADD CONSTRAINT "FK_80000c08e354bb49ed231564172" FOREIGN KEY ("fazenda_id") REFERENCES "fazendas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lancamentos" ADD CONSTRAINT "FK_434baf7634debc0b6ccd8cf4576" FOREIGN KEY ("categoria_id") REFERENCES "categorias_financeiras"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lancamentos" ADD CONSTRAINT "FK_706e52baed4a3cb0aa2b329d916" FOREIGN KEY ("animal_id") REFERENCES "animais"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lancamentos" ADD CONSTRAINT "FK_74a2d5f2c36650a60cdc28b4a04" FOREIGN KEY ("pasto_id") REFERENCES "pastos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "registros_uso" ADD CONSTRAINT "FK_136c6a1a12b6c04ffca772a513c" FOREIGN KEY ("criado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "registros_uso" ADD CONSTRAINT "FK_a4f5290174788a9da292f15175a" FOREIGN KEY ("atualizado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "registros_uso" ADD CONSTRAINT "FK_d15f37c744c4147f9e2de496e81" FOREIGN KEY ("fazenda_id") REFERENCES "fazendas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "registros_uso" ADD CONSTRAINT "FK_d5a76d9c90007c4770fa88c7742" FOREIGN KEY ("categoria_id") REFERENCES "categorias_financeiras"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "registros_uso" ADD CONSTRAINT "FK_9b00c40daf1642a7da8ab87683d" FOREIGN KEY ("animal_id") REFERENCES "animais"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "registros_uso" ADD CONSTRAINT "FK_b2e7db177a3e58d7b5a34830542" FOREIGN KEY ("pasto_id") REFERENCES "pastos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "vendas_animais" ADD CONSTRAINT "FK_01f85d984a082fae466a7450af1" FOREIGN KEY ("criado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "vendas_animais" ADD CONSTRAINT "FK_786041e7ca6b8999c47e7767bb3" FOREIGN KEY ("atualizado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "vendas_animais" ADD CONSTRAINT "FK_cf8737f3fbbac23343184961dd1" FOREIGN KEY ("fazenda_id") REFERENCES "fazendas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "itens_venda" ADD CONSTRAINT "FK_d21c73ba5a6d3e774fd626c5423" FOREIGN KEY ("venda_id") REFERENCES "vendas_animais"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "itens_venda" ADD CONSTRAINT "FK_e9902e0e2657935bc36f4a21900" FOREIGN KEY ("animal_id") REFERENCES "animais"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "itens_venda" ADD CONSTRAINT "FK_6cae2f77d9aeef36c5a4d5670ef" FOREIGN KEY ("pasto_anterior_id") REFERENCES "pastos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "itens_venda" ADD CONSTRAINT "FK_cbda40edece42b8ddace83452ad" FOREIGN KEY ("pesagem_id") REFERENCES "pesagens"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    for (const [tipo, nome, codigo] of CATEGORIAS_PADRAO) {
      await queryRunner.query(
        `INSERT INTO "categorias_financeiras" ("fazenda_id", "tipo", "nome", "codigo", "ativa") VALUES (NULL, $1, $2, $3, true)`,
        [tipo, nome, codigo],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "itens_venda" DROP CONSTRAINT "FK_cbda40edece42b8ddace83452ad"`,
    );
    await queryRunner.query(
      `ALTER TABLE "itens_venda" DROP CONSTRAINT "FK_6cae2f77d9aeef36c5a4d5670ef"`,
    );
    await queryRunner.query(
      `ALTER TABLE "itens_venda" DROP CONSTRAINT "FK_e9902e0e2657935bc36f4a21900"`,
    );
    await queryRunner.query(
      `ALTER TABLE "itens_venda" DROP CONSTRAINT "FK_d21c73ba5a6d3e774fd626c5423"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vendas_animais" DROP CONSTRAINT "FK_cf8737f3fbbac23343184961dd1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vendas_animais" DROP CONSTRAINT "FK_786041e7ca6b8999c47e7767bb3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vendas_animais" DROP CONSTRAINT "FK_01f85d984a082fae466a7450af1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "registros_uso" DROP CONSTRAINT "FK_b2e7db177a3e58d7b5a34830542"`,
    );
    await queryRunner.query(
      `ALTER TABLE "registros_uso" DROP CONSTRAINT "FK_9b00c40daf1642a7da8ab87683d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "registros_uso" DROP CONSTRAINT "FK_d5a76d9c90007c4770fa88c7742"`,
    );
    await queryRunner.query(
      `ALTER TABLE "registros_uso" DROP CONSTRAINT "FK_d15f37c744c4147f9e2de496e81"`,
    );
    await queryRunner.query(
      `ALTER TABLE "registros_uso" DROP CONSTRAINT "FK_a4f5290174788a9da292f15175a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "registros_uso" DROP CONSTRAINT "FK_136c6a1a12b6c04ffca772a513c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lancamentos" DROP CONSTRAINT "FK_74a2d5f2c36650a60cdc28b4a04"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lancamentos" DROP CONSTRAINT "FK_706e52baed4a3cb0aa2b329d916"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lancamentos" DROP CONSTRAINT "FK_434baf7634debc0b6ccd8cf4576"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lancamentos" DROP CONSTRAINT "FK_80000c08e354bb49ed231564172"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lancamentos" DROP CONSTRAINT "FK_86636b5c1516ee87fee804ab5cb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lancamentos" DROP CONSTRAINT "FK_7858604527aa2efe68c6c3bf79a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "compras_animais" DROP CONSTRAINT "FK_794edb4ecc6d4f7ad3f1853358d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "compras_animais" DROP CONSTRAINT "FK_35675ae4c4bc2ddad3213a93805"`,
    );
    await queryRunner.query(
      `ALTER TABLE "compras_animais" DROP CONSTRAINT "FK_8c4e804520c18e1252d84e13792"`,
    );
    await queryRunner.query(
      `ALTER TABLE "compras_animais" DROP CONSTRAINT "FK_f75fe1519ccf9bb9e0b9b24aea9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "categorias_financeiras" DROP CONSTRAINT "FK_caf827804351606842feeb48a97"`,
    );
    await queryRunner.query(`DROP TABLE "itens_venda"`);
    await queryRunner.query(
      `DROP TYPE "public"."itens_venda_categoria_na_venda_enum"`,
    );
    await queryRunner.query(`DROP TABLE "vendas_animais"`);
    await queryRunner.query(`DROP TYPE "public"."vendas_animais_forma_enum"`);
    await queryRunner.query(`DROP TABLE "registros_uso"`);
    await queryRunner.query(`DROP TYPE "public"."registros_uso_situacao_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_08831168bfd13cc7e05a3dba5d"`,
    );
    await queryRunner.query(`DROP TABLE "lancamentos"`);
    await queryRunner.query(`DROP TYPE "public"."lancamentos_origem_enum"`);
    await queryRunner.query(`DROP TYPE "public"."lancamentos_tipo_enum"`);
    await queryRunner.query(`DROP TABLE "compras_animais"`);
    await queryRunner.query(`DROP TABLE "categorias_financeiras"`);
    await queryRunner.query(
      `DROP TYPE "public"."categorias_financeiras_codigo_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."categorias_financeiras_tipo_enum"`,
    );
  }
}
