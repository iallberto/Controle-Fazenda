import { MigrationInterface, QueryRunner } from "typeorm";

export class Integracoes1793838296702 implements MigrationInterface {
    name = 'Integracoes1793838296702'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "recebimentos_leite" ("criado_por" uuid NOT NULL, "criado_em" TIMESTAMP NOT NULL DEFAULT now(), "atualizado_por" uuid, "atualizado_em" TIMESTAMP NOT NULL DEFAULT now(), "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fazenda_id" uuid NOT NULL, "mes" character(7) NOT NULL, "data" date NOT NULL, "litros" numeric(10,1) NOT NULL, "total_calculado_centavos" integer NOT NULL, "valor_recebido_centavos" integer NOT NULL, "observacao" character varying(200), "cancelado" boolean NOT NULL DEFAULT false, "cancelado_em" TIMESTAMP WITH TIME ZONE, "cancelado_por" uuid, "motivo_cancelamento" character varying(200), CONSTRAINT "PK_adcf829b3eea98b312df030f3b0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_recebimento_mes" ON "recebimentos_leite"  ("fazenda_id", "mes") WHERE "cancelado" = false`);
        await queryRunner.query(`ALTER TABLE "lancamentos" ADD "origem_id" uuid`);
        await queryRunner.query(`ALTER TABLE "lancamentos" ADD "origem_caminho" character varying(200)`);
        await queryRunner.query(`ALTER TABLE "insumos" ADD "categoria_despesa_id" uuid`);
        await queryRunner.query(`ALTER TYPE "public"."lancamentos_origem_enum" ADD VALUE 'LEITE'`);
        await queryRunner.query(`ALTER TYPE "public"."lancamentos_origem_enum" ADD VALUE 'NUTRICAO'`);
        await queryRunner.query(`CREATE INDEX "IDX_ce2a34885a2382edd25e66db3c" ON "lancamentos"  ("origem", "origem_id") `);
        await queryRunner.query(`ALTER TABLE "recebimentos_leite" ADD CONSTRAINT "FK_76144c088c6e1f53d621378083c" FOREIGN KEY ("criado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "recebimentos_leite" ADD CONSTRAINT "FK_60a116ac68360df8a231b5df25e" FOREIGN KEY ("atualizado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "recebimentos_leite" ADD CONSTRAINT "FK_bcc158427a30d6d03c42941bd4a" FOREIGN KEY ("fazenda_id") REFERENCES "fazendas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "recebimentos_leite" DROP CONSTRAINT "FK_bcc158427a30d6d03c42941bd4a"`);
        await queryRunner.query(`ALTER TABLE "recebimentos_leite" DROP CONSTRAINT "FK_60a116ac68360df8a231b5df25e"`);
        await queryRunner.query(`ALTER TABLE "recebimentos_leite" DROP CONSTRAINT "FK_76144c088c6e1f53d621378083c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ce2a34885a2382edd25e66db3c"`);
        await queryRunner.query(`CREATE TYPE "public"."lancamentos_origem_enum_old" AS ENUM('MANUAL', 'VENDA', 'COMPRA', 'USO')`);
        await queryRunner.query(`ALTER TABLE "lancamentos" ALTER COLUMN "origem" TYPE "public"."lancamentos_origem_enum_old" USING "origem"::"text"::"public"."lancamentos_origem_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."lancamentos_origem_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."lancamentos_origem_enum_old" RENAME TO "lancamentos_origem_enum"`);
        await queryRunner.query(`ALTER TABLE "insumos" DROP COLUMN "categoria_despesa_id"`);
        await queryRunner.query(`ALTER TABLE "lancamentos" DROP COLUMN "origem_caminho"`);
        await queryRunner.query(`ALTER TABLE "lancamentos" DROP COLUMN "origem_id"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_recebimento_mes"`);
        await queryRunner.query(`DROP TABLE "recebimentos_leite"`);
    }

}
