import { MigrationInterface, QueryRunner } from "typeorm";

export class Leite1793813977122 implements MigrationInterface {
    name = 'Leite1793813977122'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "entregas_leite" ("criado_por" uuid NOT NULL, "criado_em" TIMESTAMP NOT NULL DEFAULT now(), "atualizado_por" uuid, "atualizado_em" TIMESTAMP NOT NULL DEFAULT now(), "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fazenda_id" uuid NOT NULL, "data" date NOT NULL, "litros" numeric(8,1) NOT NULL, "preco_litro_centavos" integer, "observacao" character varying(200), "cancelado" boolean NOT NULL DEFAULT false, "cancelado_em" TIMESTAMP WITH TIME ZONE, "cancelado_por" uuid, "motivo_cancelamento" character varying(200), CONSTRAINT "PK_8263f2951f46f2e638dd33ba41f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_58c306e7bdaa48977e56ecdf65" ON "entregas_leite"  ("fazenda_id", "data") `);
        await queryRunner.query(`CREATE TABLE "analises_leite" ("criado_por" uuid NOT NULL, "criado_em" TIMESTAMP NOT NULL DEFAULT now(), "atualizado_por" uuid, "atualizado_em" TIMESTAMP NOT NULL DEFAULT now(), "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fazenda_id" uuid NOT NULL, "mes" character(7) NOT NULL, "entrega_id" uuid, "ccs_mil" integer, "cbt_mil" integer, "gordura" numeric(4,2), "proteina" numeric(4,2), "cancelado" boolean NOT NULL DEFAULT false, "cancelado_em" TIMESTAMP WITH TIME ZONE, "cancelado_por" uuid, "motivo_cancelamento" character varying(200), CONSTRAINT "PK_7388c315f954fada736c92a32a6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_17211cf241efb2fa9fb907af2d" ON "analises_leite"  ("fazenda_id", "mes") `);
        await queryRunner.query(`CREATE TABLE "produtos_leite" ("criado_por" uuid NOT NULL, "criado_em" TIMESTAMP NOT NULL DEFAULT now(), "atualizado_por" uuid, "atualizado_em" TIMESTAMP NOT NULL DEFAULT now(), "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fazenda_id" uuid NOT NULL, "nome" character varying(80) NOT NULL, "carencia_leite_dias" smallint NOT NULL, "ativo" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_aa3e403d5e9255082b996388641" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0e348bcd99aa38585501cd1a30" ON "produtos_leite"  ("fazenda_id", "nome") `);
        await queryRunner.query(`CREATE TABLE "carencias_leite" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fazenda_id" uuid NOT NULL, "animal_id" uuid NOT NULL, "tratamento_id" uuid NOT NULL, "produto_id" uuid NOT NULL, "data" date NOT NULL, "carencia_dias" smallint NOT NULL, "data_fim" date NOT NULL, CONSTRAINT "PK_85985c2ca7a8328f529f634c99f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_3a0129330ab9a3101e7674b82b" ON "carencias_leite"  ("tratamento_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_f07f8206d750993b4fdfca3139" ON "carencias_leite"  ("animal_id", "data_fim") `);
        await queryRunner.query(`CREATE TYPE "public"."configuracoes_leite_modo_enum" AS ENUM('POR_VACA', 'TANQUE')`);
        await queryRunner.query(`CREATE TABLE "configuracoes_leite" ("criado_por" uuid NOT NULL, "criado_em" TIMESTAMP NOT NULL DEFAULT now(), "atualizado_por" uuid, "atualizado_em" TIMESTAMP NOT NULL DEFAULT now(), "fazenda_id" uuid NOT NULL, "modo" "public"."configuracoes_leite_modo_enum" NOT NULL DEFAULT 'POR_VACA', "ordenhas_por_dia" smallint NOT NULL DEFAULT '2', "prazo_secagem_dias" smallint NOT NULL DEFAULT '60', "janela_secar_dias" smallint NOT NULL DEFAULT '15', CONSTRAINT "PK_a90c1f1f8a3c060079928c2a419" PRIMARY KEY ("fazenda_id"))`);
        await queryRunner.query(`CREATE TYPE "public"."lactacoes_origem_enum" AS ENUM('PARTO', 'MANUAL')`);
        await queryRunner.query(`CREATE TYPE "public"."lactacoes_motivo_fim_enum" AS ENUM('SECAGEM', 'SAIDA', 'NOVO_PARTO')`);
        await queryRunner.query(`CREATE TABLE "lactacoes" ("criado_por" uuid NOT NULL, "criado_em" TIMESTAMP NOT NULL DEFAULT now(), "atualizado_por" uuid, "atualizado_em" TIMESTAMP NOT NULL DEFAULT now(), "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fazenda_id" uuid NOT NULL, "animal_id" uuid NOT NULL, "inicio" date NOT NULL, "origem" "public"."lactacoes_origem_enum" NOT NULL, "parto_id" uuid, "fim" date, "motivo_fim" "public"."lactacoes_motivo_fim_enum", CONSTRAINT "PK_ee63cfc81d0dd50802f9cbb27d2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_44bacc6f15d930a991922dea96" ON "lactacoes"  ("fazenda_id", "inicio") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_lactacao_aberta" ON "lactacoes"  ("animal_id") WHERE "fim" IS NULL`);
        await queryRunner.query(`CREATE TYPE "public"."ordenhas_tipo_enum" AS ENUM('VACA', 'TANQUE')`);
        await queryRunner.query(`CREATE TABLE "ordenhas" ("criado_por" uuid NOT NULL, "criado_em" TIMESTAMP NOT NULL DEFAULT now(), "atualizado_por" uuid, "atualizado_em" TIMESTAMP NOT NULL DEFAULT now(), "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fazenda_id" uuid NOT NULL, "data" date NOT NULL, "turno" smallint NOT NULL, "tipo" "public"."ordenhas_tipo_enum" NOT NULL, "animal_id" uuid, "lactacao_id" uuid, "litros" numeric(7,1) NOT NULL, "descarte" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_60113711097a264db21511d94e1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_07bd63b6230fa3f7ad856333ce" ON "ordenhas"  ("lactacao_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_5e9ece0f39fb5a4c077a8955c4" ON "ordenhas"  ("fazenda_id", "data") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_ordenha_tanque" ON "ordenhas"  ("fazenda_id", "data", "turno") WHERE "tipo" = 'TANQUE'`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_ordenha_vaca" ON "ordenhas"  ("fazenda_id", "data", "turno", "animal_id") WHERE "tipo" = 'VACA'`);
        await queryRunner.query(`CREATE TABLE "secagens" ("criado_por" uuid NOT NULL, "criado_em" TIMESTAMP NOT NULL DEFAULT now(), "atualizado_por" uuid, "atualizado_em" TIMESTAMP NOT NULL DEFAULT now(), "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fazenda_id" uuid NOT NULL, "lactacao_id" uuid NOT NULL, "data" date NOT NULL, "observacao" character varying(200), "cancelado" boolean NOT NULL DEFAULT false, "cancelado_em" TIMESTAMP WITH TIME ZONE, "cancelado_por" uuid, "motivo_cancelamento" character varying(200), CONSTRAINT "PK_45f1b16aa822273799448d35dde" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_de349c56f1c677f6cffb426fcb" ON "secagens"  ("lactacao_id") `);
        await queryRunner.query(`ALTER TABLE "racas" ADD "leiteira" boolean NOT NULL DEFAULT false`);
        // Raças leiteiras (spec 004, FR-030): as padrão novas são criadas pelo
        // RacaService ao iniciar; as que já existirem com esses nomes, padrão ou
        // da fazenda, passam a leiteiras
        await queryRunner.query(`UPDATE "racas" SET "leiteira" = true WHERE lower("nome") IN ('holandesa', 'girolando', 'jersey', 'gir')`);
        await queryRunner.query(`CREATE TYPE "public"."animais_vaca_de_leite_enum" AS ENUM('PELA_RACA', 'SIM', 'NAO')`);
        await queryRunner.query(`ALTER TABLE "animais" ADD "vaca_de_leite" "public"."animais_vaca_de_leite_enum" NOT NULL DEFAULT 'PELA_RACA'`);
        await queryRunner.query(`ALTER TABLE "entregas_leite" ADD CONSTRAINT "FK_226f5b9a55a702b0ec94825e0be" FOREIGN KEY ("criado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "entregas_leite" ADD CONSTRAINT "FK_45115827c0cdb04d8b4ebfa96ea" FOREIGN KEY ("atualizado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "entregas_leite" ADD CONSTRAINT "FK_c47d6395d9ecba98d5e77fa4b02" FOREIGN KEY ("fazenda_id") REFERENCES "fazendas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "analises_leite" ADD CONSTRAINT "FK_4bca4e3cd95dd21b6782cea8f24" FOREIGN KEY ("criado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "analises_leite" ADD CONSTRAINT "FK_a2a0a4bf5c989f47baf31d30ec8" FOREIGN KEY ("atualizado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "analises_leite" ADD CONSTRAINT "FK_cf5fa266309dd21acb67e91b926" FOREIGN KEY ("fazenda_id") REFERENCES "fazendas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "analises_leite" ADD CONSTRAINT "FK_4198448d799253a7a20b317b44e" FOREIGN KEY ("entrega_id") REFERENCES "entregas_leite"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "produtos_leite" ADD CONSTRAINT "FK_8a5f46b14e37cc58da4db5fe0c5" FOREIGN KEY ("criado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "produtos_leite" ADD CONSTRAINT "FK_1c03ab534f9ed2e04c3fa1b5a43" FOREIGN KEY ("atualizado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "produtos_leite" ADD CONSTRAINT "FK_0de1da57963b636bd997d36cc2f" FOREIGN KEY ("fazenda_id") REFERENCES "fazendas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "carencias_leite" ADD CONSTRAINT "FK_143c372cbae81fb09098b8851e1" FOREIGN KEY ("fazenda_id") REFERENCES "fazendas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "carencias_leite" ADD CONSTRAINT "FK_92b392cf28c61cb87f02a3752b0" FOREIGN KEY ("animal_id") REFERENCES "animais"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "carencias_leite" ADD CONSTRAINT "FK_3a0129330ab9a3101e7674b82b5" FOREIGN KEY ("tratamento_id") REFERENCES "tratamentos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "carencias_leite" ADD CONSTRAINT "FK_e307c37901b46f154a095993d6b" FOREIGN KEY ("produto_id") REFERENCES "produtos_leite"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "configuracoes_leite" ADD CONSTRAINT "FK_a7a770111891773adea1af02719" FOREIGN KEY ("criado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "configuracoes_leite" ADD CONSTRAINT "FK_c384e64e88890e692b3f64da604" FOREIGN KEY ("atualizado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lactacoes" ADD CONSTRAINT "FK_47c311487d91ad10f8686f77b7f" FOREIGN KEY ("criado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lactacoes" ADD CONSTRAINT "FK_161a3e60c4655bf0cee13268db1" FOREIGN KEY ("atualizado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lactacoes" ADD CONSTRAINT "FK_8f1699405ba10874c2841e44f2a" FOREIGN KEY ("fazenda_id") REFERENCES "fazendas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lactacoes" ADD CONSTRAINT "FK_8754bc9543783f9e0c0adec74f5" FOREIGN KEY ("animal_id") REFERENCES "animais"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lactacoes" ADD CONSTRAINT "FK_dc93f5ea7f37e64d8131a73190f" FOREIGN KEY ("parto_id") REFERENCES "partos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ordenhas" ADD CONSTRAINT "FK_b3faf421752f73de28aeb09bbc8" FOREIGN KEY ("criado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ordenhas" ADD CONSTRAINT "FK_12d7d7a3c5d2426d56ebecb64fe" FOREIGN KEY ("atualizado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ordenhas" ADD CONSTRAINT "FK_c8efcba1621dc31f4a4b456f930" FOREIGN KEY ("fazenda_id") REFERENCES "fazendas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ordenhas" ADD CONSTRAINT "FK_38ea76c0e6b6694c9f9b53760dd" FOREIGN KEY ("animal_id") REFERENCES "animais"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ordenhas" ADD CONSTRAINT "FK_07bd63b6230fa3f7ad856333ce6" FOREIGN KEY ("lactacao_id") REFERENCES "lactacoes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "secagens" ADD CONSTRAINT "FK_76d09e233da34b1d84bd1cf7288" FOREIGN KEY ("criado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "secagens" ADD CONSTRAINT "FK_c014dbae33eb475bf152642036a" FOREIGN KEY ("atualizado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "secagens" ADD CONSTRAINT "FK_4b2a0cb209bdbdd811f606750c0" FOREIGN KEY ("fazenda_id") REFERENCES "fazendas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "secagens" ADD CONSTRAINT "FK_de349c56f1c677f6cffb426fcb7" FOREIGN KEY ("lactacao_id") REFERENCES "lactacoes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "secagens" DROP CONSTRAINT "FK_de349c56f1c677f6cffb426fcb7"`);
        await queryRunner.query(`ALTER TABLE "secagens" DROP CONSTRAINT "FK_4b2a0cb209bdbdd811f606750c0"`);
        await queryRunner.query(`ALTER TABLE "secagens" DROP CONSTRAINT "FK_c014dbae33eb475bf152642036a"`);
        await queryRunner.query(`ALTER TABLE "secagens" DROP CONSTRAINT "FK_76d09e233da34b1d84bd1cf7288"`);
        await queryRunner.query(`ALTER TABLE "ordenhas" DROP CONSTRAINT "FK_07bd63b6230fa3f7ad856333ce6"`);
        await queryRunner.query(`ALTER TABLE "ordenhas" DROP CONSTRAINT "FK_38ea76c0e6b6694c9f9b53760dd"`);
        await queryRunner.query(`ALTER TABLE "ordenhas" DROP CONSTRAINT "FK_c8efcba1621dc31f4a4b456f930"`);
        await queryRunner.query(`ALTER TABLE "ordenhas" DROP CONSTRAINT "FK_12d7d7a3c5d2426d56ebecb64fe"`);
        await queryRunner.query(`ALTER TABLE "ordenhas" DROP CONSTRAINT "FK_b3faf421752f73de28aeb09bbc8"`);
        await queryRunner.query(`ALTER TABLE "lactacoes" DROP CONSTRAINT "FK_dc93f5ea7f37e64d8131a73190f"`);
        await queryRunner.query(`ALTER TABLE "lactacoes" DROP CONSTRAINT "FK_8754bc9543783f9e0c0adec74f5"`);
        await queryRunner.query(`ALTER TABLE "lactacoes" DROP CONSTRAINT "FK_8f1699405ba10874c2841e44f2a"`);
        await queryRunner.query(`ALTER TABLE "lactacoes" DROP CONSTRAINT "FK_161a3e60c4655bf0cee13268db1"`);
        await queryRunner.query(`ALTER TABLE "lactacoes" DROP CONSTRAINT "FK_47c311487d91ad10f8686f77b7f"`);
        await queryRunner.query(`ALTER TABLE "configuracoes_leite" DROP CONSTRAINT "FK_c384e64e88890e692b3f64da604"`);
        await queryRunner.query(`ALTER TABLE "configuracoes_leite" DROP CONSTRAINT "FK_a7a770111891773adea1af02719"`);
        await queryRunner.query(`ALTER TABLE "carencias_leite" DROP CONSTRAINT "FK_e307c37901b46f154a095993d6b"`);
        await queryRunner.query(`ALTER TABLE "carencias_leite" DROP CONSTRAINT "FK_3a0129330ab9a3101e7674b82b5"`);
        await queryRunner.query(`ALTER TABLE "carencias_leite" DROP CONSTRAINT "FK_92b392cf28c61cb87f02a3752b0"`);
        await queryRunner.query(`ALTER TABLE "carencias_leite" DROP CONSTRAINT "FK_143c372cbae81fb09098b8851e1"`);
        await queryRunner.query(`ALTER TABLE "produtos_leite" DROP CONSTRAINT "FK_0de1da57963b636bd997d36cc2f"`);
        await queryRunner.query(`ALTER TABLE "produtos_leite" DROP CONSTRAINT "FK_1c03ab534f9ed2e04c3fa1b5a43"`);
        await queryRunner.query(`ALTER TABLE "produtos_leite" DROP CONSTRAINT "FK_8a5f46b14e37cc58da4db5fe0c5"`);
        await queryRunner.query(`ALTER TABLE "analises_leite" DROP CONSTRAINT "FK_4198448d799253a7a20b317b44e"`);
        await queryRunner.query(`ALTER TABLE "analises_leite" DROP CONSTRAINT "FK_cf5fa266309dd21acb67e91b926"`);
        await queryRunner.query(`ALTER TABLE "analises_leite" DROP CONSTRAINT "FK_a2a0a4bf5c989f47baf31d30ec8"`);
        await queryRunner.query(`ALTER TABLE "analises_leite" DROP CONSTRAINT "FK_4bca4e3cd95dd21b6782cea8f24"`);
        await queryRunner.query(`ALTER TABLE "entregas_leite" DROP CONSTRAINT "FK_c47d6395d9ecba98d5e77fa4b02"`);
        await queryRunner.query(`ALTER TABLE "entregas_leite" DROP CONSTRAINT "FK_45115827c0cdb04d8b4ebfa96ea"`);
        await queryRunner.query(`ALTER TABLE "entregas_leite" DROP CONSTRAINT "FK_226f5b9a55a702b0ec94825e0be"`);
        await queryRunner.query(`ALTER TABLE "animais" DROP COLUMN "vaca_de_leite"`);
        await queryRunner.query(`DROP TYPE "public"."animais_vaca_de_leite_enum"`);
        await queryRunner.query(`ALTER TABLE "racas" DROP COLUMN "leiteira"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_de349c56f1c677f6cffb426fcb"`);
        await queryRunner.query(`DROP TABLE "secagens"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_ordenha_vaca"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_ordenha_tanque"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5e9ece0f39fb5a4c077a8955c4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_07bd63b6230fa3f7ad856333ce"`);
        await queryRunner.query(`DROP TABLE "ordenhas"`);
        await queryRunner.query(`DROP TYPE "public"."ordenhas_tipo_enum"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_lactacao_aberta"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_44bacc6f15d930a991922dea96"`);
        await queryRunner.query(`DROP TABLE "lactacoes"`);
        await queryRunner.query(`DROP TYPE "public"."lactacoes_motivo_fim_enum"`);
        await queryRunner.query(`DROP TYPE "public"."lactacoes_origem_enum"`);
        await queryRunner.query(`DROP TABLE "configuracoes_leite"`);
        await queryRunner.query(`DROP TYPE "public"."configuracoes_leite_modo_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f07f8206d750993b4fdfca3139"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3a0129330ab9a3101e7674b82b"`);
        await queryRunner.query(`DROP TABLE "carencias_leite"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0e348bcd99aa38585501cd1a30"`);
        await queryRunner.query(`DROP TABLE "produtos_leite"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_17211cf241efb2fa9fb907af2d"`);
        await queryRunner.query(`DROP TABLE "analises_leite"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_58c306e7bdaa48977e56ecdf65"`);
        await queryRunner.query(`DROP TABLE "entregas_leite"`);
    }

}
