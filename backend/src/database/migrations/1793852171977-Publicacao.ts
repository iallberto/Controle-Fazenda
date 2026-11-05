import { MigrationInterface, QueryRunner } from "typeorm";

export class Publicacao1793852171977 implements MigrationInterface {
    name = 'Publicacao1793852171977'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "usuarios" ADD "precisa_trocar_senha" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "usuarios" ADD "senha_alterada_em" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "administradores" ADD "senha_alterada_em" TIMESTAMP WITH TIME ZONE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "administradores" DROP COLUMN "senha_alterada_em"`);
        await queryRunner.query(`ALTER TABLE "usuarios" DROP COLUMN "senha_alterada_em"`);
        await queryRunner.query(`ALTER TABLE "usuarios" DROP COLUMN "precisa_trocar_senha"`);
    }

}
