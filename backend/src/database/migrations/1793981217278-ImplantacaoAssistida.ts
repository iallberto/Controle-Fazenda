import { MigrationInterface, QueryRunner } from "typeorm";

export class ImplantacaoAssistida1793981217278 implements MigrationInterface {
    name = 'ImplantacaoAssistida1793981217278'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."precos_plano_item_enum" AS ENUM('PACOTE_INICIAL', 'LEITE', 'FINANCEIRO', 'NUTRICAO')`);
        await queryRunner.query(`CREATE TABLE "precos_plano" ("item" "public"."precos_plano_item_enum" NOT NULL, "valor_centavos" integer NOT NULL DEFAULT '0', "atualizado_em" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6c31fc6b239169b5dffca3dd5d3" PRIMARY KEY ("item"))`);
        await queryRunner.query(`CREATE TYPE "public"."registros_acesso_tipo_enum" AS ENUM('TESTE', 'PAGAMENTO', 'EXTENSAO', 'SEM_PRAZO')`);
        await queryRunner.query(`CREATE TABLE "registros_acesso" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fazenda_id" uuid NOT NULL, "tipo" "public"."registros_acesso_tipo_enum" NOT NULL, "de" date, "ate" date, "modulos" text NOT NULL DEFAULT '', "valor_centavos" integer, "administrador_id" uuid NOT NULL, "criado_em" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_abae43fbf305d6c541377cca459" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_32c829bef07dd19e944fa6a175" ON "registros_acesso"  ("fazenda_id", "criado_em") `);
        await queryRunner.query(`CREATE TABLE "sessoes_suporte" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "administrador_id" uuid NOT NULL, "fazenda_id" uuid NOT NULL, "usuario_id" uuid NOT NULL, "entrada_em" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "saida_em" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_45dbe88090ecb0d02a59409590b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c165f78e344235e78a3357d6fe" ON "sessoes_suporte"  ("fazenda_id", "entrada_em") `);
        await queryRunner.query(`ALTER TABLE "fazendas" ADD "sem_prazo" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "fazendas" ADD "acesso_ate" date`);
        await queryRunner.query(`ALTER TABLE "fazendas" ADD "modulos_plano" text NOT NULL DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE "fazendas" ADD "telefone_contato" character varying(30)`);
        await queryRunner.query(`ALTER TABLE "usuarios" ADD "suporte" boolean NOT NULL DEFAULT false`);
        // Fazendas anteriores à spec 008 seguem sem prazo; as novas nascem
        // aguardando implantação (research R7)
        await queryRunner.query(`UPDATE "fazendas" SET "sem_prazo" = true`);
        // Preços do plano começam em zero; o administrador define no painel (R5)
        await queryRunner.query(`INSERT INTO "precos_plano" ("item", "valor_centavos") VALUES ('PACOTE_INICIAL', 0), ('LEITE', 0), ('FINANCEIRO', 0), ('NUTRICAO', 0)`);
        await queryRunner.query(`ALTER TABLE "registros_acesso" ADD CONSTRAINT "FK_daefd48c9153f066812c2fc6d9b" FOREIGN KEY ("fazenda_id") REFERENCES "fazendas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "registros_acesso" ADD CONSTRAINT "FK_2eacfdb233a57a9ecf551ac1be2" FOREIGN KEY ("administrador_id") REFERENCES "administradores"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sessoes_suporte" ADD CONSTRAINT "FK_dd56ce4844a97ced202bf28fd4d" FOREIGN KEY ("administrador_id") REFERENCES "administradores"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sessoes_suporte" ADD CONSTRAINT "FK_1f17b003cac7b72a87a048fb209" FOREIGN KEY ("fazenda_id") REFERENCES "fazendas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sessoes_suporte" ADD CONSTRAINT "FK_58d5a3a6682e8d991cb0207cdf6" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "sessoes_suporte" DROP CONSTRAINT "FK_58d5a3a6682e8d991cb0207cdf6"`);
        await queryRunner.query(`ALTER TABLE "sessoes_suporte" DROP CONSTRAINT "FK_1f17b003cac7b72a87a048fb209"`);
        await queryRunner.query(`ALTER TABLE "sessoes_suporte" DROP CONSTRAINT "FK_dd56ce4844a97ced202bf28fd4d"`);
        await queryRunner.query(`ALTER TABLE "registros_acesso" DROP CONSTRAINT "FK_2eacfdb233a57a9ecf551ac1be2"`);
        await queryRunner.query(`ALTER TABLE "registros_acesso" DROP CONSTRAINT "FK_daefd48c9153f066812c2fc6d9b"`);
        await queryRunner.query(`ALTER TABLE "usuarios" DROP COLUMN "suporte"`);
        await queryRunner.query(`ALTER TABLE "fazendas" DROP COLUMN "telefone_contato"`);
        await queryRunner.query(`ALTER TABLE "fazendas" DROP COLUMN "modulos_plano"`);
        await queryRunner.query(`ALTER TABLE "fazendas" DROP COLUMN "acesso_ate"`);
        await queryRunner.query(`ALTER TABLE "fazendas" DROP COLUMN "sem_prazo"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c165f78e344235e78a3357d6fe"`);
        await queryRunner.query(`DROP TABLE "sessoes_suporte"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_32c829bef07dd19e944fa6a175"`);
        await queryRunner.query(`DROP TABLE "registros_acesso"`);
        await queryRunner.query(`DROP TYPE "public"."registros_acesso_tipo_enum"`);
        await queryRunner.query(`DROP TABLE "precos_plano"`);
        await queryRunner.query(`DROP TYPE "public"."precos_plano_item_enum"`);
    }

}
