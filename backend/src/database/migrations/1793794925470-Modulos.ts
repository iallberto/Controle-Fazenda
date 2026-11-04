import { MigrationInterface, QueryRunner } from 'typeorm';

// Fase 0 (spec 002): liberações de módulos por fazenda, administrador do
// sistema, tentativas de login do administrador e suspensão de fazenda.
// Só acrescenta: nenhuma tabela existente perde dados.

export class Modulos1793794925470 implements MigrationInterface {
  name = 'Modulos1793794925470';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "administradores" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "nome" character varying NOT NULL, "email" character varying NOT NULL, "senha_hash" character varying NOT NULL, "ativo" boolean NOT NULL DEFAULT true, "criado_em" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_c32368ba8dc0330ebf725b02c05" UNIQUE ("email"), CONSTRAINT "PK_6956c0b545649bba08e4099c81a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."modulos_fazenda_modulo_enum" AS ENUM('LEITE', 'FINANCEIRO', 'NUTRICAO')`,
    );
    await queryRunner.query(
      `CREATE TABLE "modulos_fazenda" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fazenda_id" uuid NOT NULL, "modulo" "public"."modulos_fazenda_modulo_enum" NOT NULL, "data_inicio" date NOT NULL, "data_termino" date, "liberado_por" uuid NOT NULL, "liberado_em" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "desativado_por" uuid, "desativado_em" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_f402d28f6f247cb1f18ed203b2f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e5f9488810484c22d02db108c6" ON "modulos_fazenda"  ("fazenda_id", "modulo") `,
    );
    await queryRunner.query(
      `CREATE TABLE "fazenda_suspensoes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fazenda_id" uuid NOT NULL, "motivo" character varying(200) NOT NULL, "suspensa_por" uuid NOT NULL, "suspensa_em" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "reativada_por" uuid, "reativada_em" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_13acfc4eadc4c74f0dec660179d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "admin_tentativas_login" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "sucesso" boolean NOT NULL, "ip" character varying, "criado_em" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_f8a79a317c687acc5504a77479c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_28218e5468b2f8cb68fd15b465" ON "admin_tentativas_login"  ("email", "criado_em") `,
    );
    await queryRunner.query(
      `ALTER TABLE "fazendas" ADD "suspensa" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "modulos_fazenda" ADD CONSTRAINT "FK_fc7d6caa9d08e6dafeda016a812" FOREIGN KEY ("fazenda_id") REFERENCES "fazendas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "modulos_fazenda" ADD CONSTRAINT "FK_12e85eca68024a768b8fde75925" FOREIGN KEY ("liberado_por") REFERENCES "administradores"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "modulos_fazenda" ADD CONSTRAINT "FK_fab1ac3719b3cebbe4a7d410b00" FOREIGN KEY ("desativado_por") REFERENCES "administradores"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "fazenda_suspensoes" ADD CONSTRAINT "FK_6181c3c03d73ca50ac422e2db97" FOREIGN KEY ("fazenda_id") REFERENCES "fazendas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "fazenda_suspensoes" ADD CONSTRAINT "FK_f93c3534cf8f54515c8d42a36a2" FOREIGN KEY ("suspensa_por") REFERENCES "administradores"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "fazenda_suspensoes" ADD CONSTRAINT "FK_5ffa09b07225cdab3455d591cb9" FOREIGN KEY ("reativada_por") REFERENCES "administradores"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "fazenda_suspensoes" DROP CONSTRAINT "FK_5ffa09b07225cdab3455d591cb9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "fazenda_suspensoes" DROP CONSTRAINT "FK_f93c3534cf8f54515c8d42a36a2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "fazenda_suspensoes" DROP CONSTRAINT "FK_6181c3c03d73ca50ac422e2db97"`,
    );
    await queryRunner.query(
      `ALTER TABLE "modulos_fazenda" DROP CONSTRAINT "FK_fab1ac3719b3cebbe4a7d410b00"`,
    );
    await queryRunner.query(
      `ALTER TABLE "modulos_fazenda" DROP CONSTRAINT "FK_12e85eca68024a768b8fde75925"`,
    );
    await queryRunner.query(
      `ALTER TABLE "modulos_fazenda" DROP CONSTRAINT "FK_fc7d6caa9d08e6dafeda016a812"`,
    );
    await queryRunner.query(`ALTER TABLE "fazendas" DROP COLUMN "suspensa"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_28218e5468b2f8cb68fd15b465"`,
    );
    await queryRunner.query(`DROP TABLE "admin_tentativas_login"`);
    await queryRunner.query(`DROP TABLE "fazenda_suspensoes"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e5f9488810484c22d02db108c6"`,
    );
    await queryRunner.query(`DROP TABLE "modulos_fazenda"`);
    await queryRunner.query(`DROP TYPE "public"."modulos_fazenda_modulo_enum"`);
    await queryRunner.query(`DROP TABLE "administradores"`);
  }
}
