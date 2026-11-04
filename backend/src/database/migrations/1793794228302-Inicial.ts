import { MigrationInterface, QueryRunner } from 'typeorm';

// Estrutura completa do banco no momento em que o synchronize foi desligado
// (spec 002, research R2). Gerada contra um banco vazio.
//
// Baseline: num banco criado antes, pelo synchronize, as tabelas já existem.
// Nesse caso a migration não executa nada e só fica registrada como aplicada,
// preservando todos os dados. A igualdade da estrutura é conferida depois com
// `npm run migration:generate`, que precisa responder "No changes".

export class Inicial1793794228302 implements MigrationInterface {
  name = 'Inicial1793794228302';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('fazendas')) {
      return;
    }
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(
      `CREATE TABLE "fazendas" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "nome" character varying NOT NULL, "criadoEm" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d50a11f61636e2081c5cdfa02e1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."usuarios_papel_enum" AS ENUM('DONO', 'FUNCIONARIO')`,
    );
    await queryRunner.query(
      `CREATE TABLE "usuarios" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fazenda_id" uuid NOT NULL, "nome" character varying NOT NULL, "email" character varying NOT NULL, "senha_hash" character varying NOT NULL, "papel" "public"."usuarios_papel_enum" NOT NULL DEFAULT 'FUNCIONARIO', "criado_por" uuid, "ativo" boolean NOT NULL DEFAULT true, "criado_em" TIMESTAMP NOT NULL DEFAULT now(), "atualizado_em" TIMESTAMP NOT NULL DEFAULT now(), "atualizado_por" uuid, CONSTRAINT "UQ_446adfc18b35418aac32ae0b7b5" UNIQUE ("email"), CONSTRAINT "PK_d7281c63c176e152e4c531594a8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "racas" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fazenda_id" uuid, "nome" character varying NOT NULL, "gestacao_media_dias" integer NOT NULL, "criado_por" uuid, "criado_em" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f213506e4d2c904d32c18f36c87" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "pastos" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fazenda_id" uuid NOT NULL, "nome" character varying NOT NULL, "criado_por" uuid NOT NULL, "criado_em" TIMESTAMP NOT NULL DEFAULT now(), "atualizado_em" TIMESTAMP NOT NULL DEFAULT now(), "atualizado_por" uuid, CONSTRAINT "UQ_97942dd6773132bd420af001e0a" UNIQUE ("fazenda_id", "nome"), CONSTRAINT "PK_081c3c3f2579559cd8b8cf728ce" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "veterinarios" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fazenda_id" uuid NOT NULL, "nome" character varying NOT NULL, "crmv" character varying, "ativo" boolean NOT NULL DEFAULT true, "criado_por" uuid NOT NULL, "criado_em" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e3684772bab12067bdb378008bf" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tratamentos_aplicado_por_tipo_enum" AS ENUM('USUARIO', 'VETERINARIO')`,
    );
    await queryRunner.query(
      `CREATE TABLE "tratamentos" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "animal_id" uuid NOT NULL, "produto" character varying NOT NULL, "data" date NOT NULL, "recorrencia_dias" integer, "proxima_data_prevista" date, "aplicado_por_tipo" "public"."tratamentos_aplicado_por_tipo_enum" NOT NULL, "aplicado_por_usuario_id" uuid, "aplicado_por_veterinario_id" uuid, "lancado_por" uuid NOT NULL, "criado_em" TIMESTAMP NOT NULL DEFAULT now(), "sessao_manejo_id" uuid, "atualizado_em" TIMESTAMP NOT NULL DEFAULT now(), "atualizado_por" uuid, CONSTRAINT "PK_285ecd058d8704b2672d20aff69" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "semens" ("criado_por" uuid NOT NULL, "criado_em" TIMESTAMP NOT NULL DEFAULT now(), "atualizado_por" uuid, "atualizado_em" TIMESTAMP NOT NULL DEFAULT now(), "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fazenda_id" uuid NOT NULL, "nome_touro" character varying NOT NULL, "raca_id" uuid, "central" character varying, "doses" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_1e4af8e123a33092ee5f3f2e7a7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."inseminacoes_tipo_enum" AS ENUM('IA', 'IATF')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."inseminacoes_aplicado_por_tipo_enum" AS ENUM('USUARIO', 'VETERINARIO')`,
    );
    await queryRunner.query(
      `CREATE TABLE "inseminacoes" ("criado_por" uuid NOT NULL, "criado_em" TIMESTAMP NOT NULL DEFAULT now(), "atualizado_por" uuid, "atualizado_em" TIMESTAMP NOT NULL DEFAULT now(), "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "femea_id" uuid NOT NULL, "data" date NOT NULL, "tipo" "public"."inseminacoes_tipo_enum" NOT NULL, "semen_id" uuid NOT NULL, "aplicado_por_tipo" "public"."inseminacoes_aplicado_por_tipo_enum" NOT NULL, "aplicado_por_usuario_id" uuid, "aplicado_por_veterinario_id" uuid, "cancelado" boolean NOT NULL DEFAULT false, "cancelado_em" TIMESTAMP WITH TIME ZONE, "cancelado_por" uuid, "motivo_cancelamento" character varying(200), CONSTRAINT "PK_6e0d10ce26f23ee9e5570970790" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "parto_candidatos_pai" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "parto_id" uuid NOT NULL, "touro_id" uuid, "semen_id" uuid, CONSTRAINT "PK_115d1636e87e8df17e53af7b6ac" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."partos_resultado_enum" AS ENUM('VIVO', 'NATIMORTO')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."partos_tipo_enum" AS ENUM('NORMAL', 'ASSISTIDO')`,
    );
    await queryRunner.query(
      `CREATE TABLE "partos" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "mae_id" uuid NOT NULL, "data" date NOT NULL, "resultado" "public"."partos_resultado_enum" NOT NULL, "tipo" "public"."partos_tipo_enum" NOT NULL, "observacoes" text, "inseminacao_id" uuid, "criado_por" uuid NOT NULL, "criado_em" TIMESTAMP NOT NULL DEFAULT now(), "atualizado_em" TIMESTAMP NOT NULL DEFAULT now(), "atualizado_por" uuid, CONSTRAINT "PK_14bbcf4d84d114f0cc40abedea4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."animais_sexo_enum" AS ENUM('M', 'F')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."animais_categoria_enum" AS ENUM('BEZERRO', 'NOVILHA', 'MATRIZ', 'GARROTE', 'BOI', 'TOURO')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."animais_status_enum" AS ENUM('ATIVO', 'VENDIDO', 'MORTO', 'DESCARTADO')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."animais_status_reprodutivo_enum" AS ENUM('PRENHA', 'LACTANTE', 'VAZIA')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."animais_origem_enum" AS ENUM('NASCIDO_FAZENDA', 'COMPRADO')`,
    );
    await queryRunner.query(
      `CREATE TABLE "animais" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fazenda_id" uuid NOT NULL, "parto_id" uuid, "brinco" character varying NOT NULL, "sexo" "public"."animais_sexo_enum" NOT NULL, "categoria" "public"."animais_categoria_enum" NOT NULL, "status" "public"."animais_status_enum" NOT NULL DEFAULT 'ATIVO', "status_reprodutivo" "public"."animais_status_reprodutivo_enum", "origem" "public"."animais_origem_enum" NOT NULL, "data_nascimento" date NOT NULL, "raca_id" uuid, "mae_id" uuid, "pai_id" uuid, "pai_semen_id" uuid, "pasto_atual_id" uuid, "caracteristicas_visuais" text, "data_compra" date, "procedencia" character varying, "motivo_status" character varying, "data_status" date, "criado_por" uuid NOT NULL, "criado_em" TIMESTAMP NOT NULL DEFAULT now(), "atualizado_em" TIMESTAMP NOT NULL DEFAULT now(), "atualizado_por" uuid, CONSTRAINT "UQ_c7c2dae76f18da8fdc53eb277e6" UNIQUE ("fazenda_id", "brinco"), CONSTRAINT "PK_80a52ded49b9f912c01c566a334" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."codigos_identificacao_status_enum" AS ENUM('DISPONIVEL', 'VINCULADO', 'DESATIVADO')`,
    );
    await queryRunner.query(
      `CREATE TABLE "codigos_identificacao" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fazenda_id" uuid NOT NULL, "codigo" character varying NOT NULL, "numero" integer NOT NULL, "status" "public"."codigos_identificacao_status_enum" NOT NULL DEFAULT 'DISPONIVEL', "animal_id" uuid, "criado_por" uuid NOT NULL, "gerado_em" TIMESTAMP NOT NULL DEFAULT now(), "vinculado_em" TIMESTAMP, CONSTRAINT "UQ_d8541b8b96800eaff925a73ff70" UNIQUE ("codigo"), CONSTRAINT "UQ_2778e47a9e2c684146998fba6f5" UNIQUE ("fazenda_id", "numero"), CONSTRAINT "PK_7059362bcc44a06f46419e3fa92" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "historico_numero" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fazenda_id" uuid NOT NULL, "animal_id" uuid NOT NULL, "numero_anterior" character varying NOT NULL, "numero_novo" character varying NOT NULL, "motivo" character varying, "reemitido_por" uuid NOT NULL, "reemitido_em" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4d84fa80df3d201678f90e9c5a4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_664a30a67150c0ae0c00f0662b" ON "historico_numero"  ("fazenda_id", "numero_anterior") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."configuracoes_fazenda_som_enum" AS ENUM('SINO', 'BIPE', 'DUPLO')`,
    );
    await queryRunner.query(
      `CREATE TABLE "configuracoes_fazenda" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fazenda_id" uuid NOT NULL, "notificacoes_ativas" boolean NOT NULL DEFAULT true, "som_ativo" boolean NOT NULL DEFAULT true, "som" "public"."configuracoes_fazenda_som_enum" NOT NULL DEFAULT 'SINO', CONSTRAINT "UQ_ad7b0cae85143bc0c7829bc8491" UNIQUE ("fazenda_id"), CONSTRAINT "REL_ad7b0cae85143bc0c7829bc849" UNIQUE ("fazenda_id"), CONSTRAINT "PK_dab215ea0d45e58173ded28f8ed" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."valores_arroba_categoria_categoria_enum" AS ENUM('BEZERRO', 'NOVILHA', 'MATRIZ', 'GARROTE', 'BOI', 'TOURO')`,
    );
    await queryRunner.query(
      `CREATE TABLE "valores_arroba_categoria" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "configuracao_fazenda_id" uuid NOT NULL, "categoria" "public"."valores_arroba_categoria_categoria_enum" NOT NULL, "peso_referencia_kg" numeric(5,2) NOT NULL, CONSTRAINT "UQ_de4f8c88591ffbf47babba8c606" UNIQUE ("configuracao_fazenda_id", "categoria"), CONSTRAINT "PK_d43f6be34252c06993e997370c1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."sessoes_manejo_tipo_enum" AS ENUM('TRATAMENTO', 'PASTO')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."sessoes_manejo_filtro_categoria_enum" AS ENUM('BEZERRO', 'NOVILHA', 'MATRIZ', 'GARROTE', 'BOI', 'TOURO')`,
    );
    await queryRunner.query(
      `CREATE TABLE "sessoes_manejo" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fazenda_id" uuid NOT NULL, "tipo" "public"."sessoes_manejo_tipo_enum" NOT NULL, "filtro_pasto_id" uuid, "filtro_categoria" "public"."sessoes_manejo_filtro_categoria_enum", "data" date NOT NULL, "produto" character varying, "pasto_destino_id" uuid, "total_animais" integer NOT NULL, "criado_por" uuid NOT NULL, "criado_em" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_fb12935cde159f74c816ca2c21c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "sessoes_manejo_excecoes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "sessao_id" uuid NOT NULL, "animal_id" uuid NOT NULL, "motivo" character varying NOT NULL, CONSTRAINT "PK_cef77a80701b814e81026b9219a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "movimentacoes_pasto" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "animal_id" uuid NOT NULL, "pasto_id" uuid NOT NULL, "data_entrada" date NOT NULL, "data_saida" date, "criado_por" uuid, "criado_em" TIMESTAMP NOT NULL DEFAULT now(), "sessao_manejo_id" uuid, CONSTRAINT "PK_a7f2b4a70c996aefea8cc843307" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "pesagens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "animal_id" uuid NOT NULL, "peso_kg" numeric(6,2) NOT NULL, "data" date NOT NULL, "pesado_por" uuid NOT NULL, "lancado_por" uuid NOT NULL, "observacao" text, "criado_em" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c0226d7235336c0f23834eea06a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."diagnosticos_gestacao_resultado_enum" AS ENUM('PRENHE', 'VAZIA', 'PERDA')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."diagnosticos_gestacao_metodo_enum" AS ENUM('TOQUE', 'ULTRASSOM')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."diagnosticos_gestacao_feito_por_tipo_enum" AS ENUM('USUARIO', 'VETERINARIO')`,
    );
    await queryRunner.query(
      `CREATE TABLE "diagnosticos_gestacao" ("criado_por" uuid NOT NULL, "criado_em" TIMESTAMP NOT NULL DEFAULT now(), "atualizado_por" uuid, "atualizado_em" TIMESTAMP NOT NULL DEFAULT now(), "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "femea_id" uuid NOT NULL, "data" date NOT NULL, "resultado" "public"."diagnosticos_gestacao_resultado_enum" NOT NULL, "metodo" "public"."diagnosticos_gestacao_metodo_enum", "idade_gestacional_dias" integer, "motivo" character varying(200), "feito_por_tipo" "public"."diagnosticos_gestacao_feito_por_tipo_enum" NOT NULL, "feito_por_usuario_id" uuid, "feito_por_veterinario_id" uuid, "sessao_id" uuid, "cancelado" boolean NOT NULL DEFAULT false, "cancelado_em" TIMESTAMP WITH TIME ZONE, "cancelado_por" uuid, "motivo_cancelamento" character varying(200), CONSTRAINT "PK_4706ae9869b6b9444f367f60867" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."exposicoes_monta_motivo_fim_enum" AS ENUM('ESTACAO_ENCERRADA', 'SAIU_DO_PASTO', 'SAIU_DO_REBANHO')`,
    );
    await queryRunner.query(
      `CREATE TABLE "exposicoes_monta" ("criado_por" uuid NOT NULL, "criado_em" TIMESTAMP NOT NULL DEFAULT now(), "atualizado_por" uuid, "atualizado_em" TIMESTAMP NOT NULL DEFAULT now(), "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "estacao_id" uuid NOT NULL, "femea_id" uuid NOT NULL, "data_inicio" date NOT NULL, "data_fim" date, "motivo_fim" "public"."exposicoes_monta_motivo_fim_enum", "cancelado" boolean NOT NULL DEFAULT false, "cancelado_em" TIMESTAMP WITH TIME ZONE, "cancelado_por" uuid, "motivo_cancelamento" character varying(200), CONSTRAINT "PK_e42af49a93104efb29f890f17cd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "excecoes_estacao_monta" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "estacao_id" uuid NOT NULL, "femea_id" uuid NOT NULL, "motivo" character varying(200) NOT NULL, CONSTRAINT "PK_a29f7afa2a701eb76f1f623feaf" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."estacoes_monta_motivo_encerramento_enum" AS ENUM('MANUAL', 'TOURO_SAIU_DO_PASTO', 'TOURO_SAIU_DO_REBANHO')`,
    );
    await queryRunner.query(
      `CREATE TABLE "estacoes_monta" ("criado_por" uuid NOT NULL, "criado_em" TIMESTAMP NOT NULL DEFAULT now(), "atualizado_por" uuid, "atualizado_em" TIMESTAMP NOT NULL DEFAULT now(), "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fazenda_id" uuid NOT NULL, "touro_id" uuid NOT NULL, "pasto_id" uuid NOT NULL, "data_entrada" date NOT NULL, "data_saida" date, "motivo_encerramento" "public"."estacoes_monta_motivo_encerramento_enum", "cancelado" boolean NOT NULL DEFAULT false, "cancelado_em" TIMESTAMP WITH TIME ZONE, "cancelado_por" uuid, "motivo_cancelamento" character varying(200), CONSTRAINT "PK_edcf99797256e3c9ba352858ead" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios" ADD CONSTRAINT "FK_bb0ff6196a6f2413728d511a83b" FOREIGN KEY ("fazenda_id") REFERENCES "fazendas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios" ADD CONSTRAINT "FK_8e918a3b3a64f2ddbcc40984449" FOREIGN KEY ("criado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios" ADD CONSTRAINT "FK_20b8f3eee215f8f932e299b6b84" FOREIGN KEY ("atualizado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "racas" ADD CONSTRAINT "FK_5efaa0b0f437fd60637492250b8" FOREIGN KEY ("fazenda_id") REFERENCES "fazendas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "racas" ADD CONSTRAINT "FK_137c9075da886e8bd7bec2d4147" FOREIGN KEY ("criado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "pastos" ADD CONSTRAINT "FK_01f2a18831867f120e3575cb1d6" FOREIGN KEY ("fazenda_id") REFERENCES "fazendas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "pastos" ADD CONSTRAINT "FK_5f4adddec9d53809bfb251eef44" FOREIGN KEY ("criado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "pastos" ADD CONSTRAINT "FK_dd9acc728fd9ef5d1c7f6844809" FOREIGN KEY ("atualizado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "veterinarios" ADD CONSTRAINT "FK_7b1f53b73b5ce3c1f6a3f3f8a43" FOREIGN KEY ("fazenda_id") REFERENCES "fazendas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "veterinarios" ADD CONSTRAINT "FK_070a6847dba779eab819bb2461c" FOREIGN KEY ("criado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tratamentos" ADD CONSTRAINT "FK_770c642d33d7e8500afc753a30f" FOREIGN KEY ("animal_id") REFERENCES "animais"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tratamentos" ADD CONSTRAINT "FK_28e8669e7d786a3a1c444edd4c6" FOREIGN KEY ("aplicado_por_usuario_id") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tratamentos" ADD CONSTRAINT "FK_964b00330c7ce7da63a0be90918" FOREIGN KEY ("aplicado_por_veterinario_id") REFERENCES "veterinarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tratamentos" ADD CONSTRAINT "FK_33216123b3e1bff6f8d9c821f7c" FOREIGN KEY ("lancado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tratamentos" ADD CONSTRAINT "FK_f59368ff74f742abffe0adf2d42" FOREIGN KEY ("atualizado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "semens" ADD CONSTRAINT "FK_685cc970df1b8928ab40372911d" FOREIGN KEY ("criado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "semens" ADD CONSTRAINT "FK_1c4b3f042d2df4135137ae58946" FOREIGN KEY ("atualizado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "semens" ADD CONSTRAINT "FK_d0a90a9d6cfa693e54279d6e050" FOREIGN KEY ("fazenda_id") REFERENCES "fazendas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "semens" ADD CONSTRAINT "FK_cb9d5687365ba5ae2301b24d8a8" FOREIGN KEY ("raca_id") REFERENCES "racas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inseminacoes" ADD CONSTRAINT "FK_386867256a4db01465f05eae326" FOREIGN KEY ("criado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inseminacoes" ADD CONSTRAINT "FK_829ab50ad4a5d9ff4e7ba5db0ad" FOREIGN KEY ("atualizado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inseminacoes" ADD CONSTRAINT "FK_8fe30ca95510d0c71867ad4a8af" FOREIGN KEY ("femea_id") REFERENCES "animais"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inseminacoes" ADD CONSTRAINT "FK_cbb5e72e285a8153806f3ec9aa8" FOREIGN KEY ("semen_id") REFERENCES "semens"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inseminacoes" ADD CONSTRAINT "FK_d8ecdd6542645ea848d3b88aa62" FOREIGN KEY ("aplicado_por_usuario_id") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inseminacoes" ADD CONSTRAINT "FK_4d7535954cf3c92417c500be8c0" FOREIGN KEY ("aplicado_por_veterinario_id") REFERENCES "veterinarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "parto_candidatos_pai" ADD CONSTRAINT "FK_8242ca7a4569729b8ac72ca567c" FOREIGN KEY ("parto_id") REFERENCES "partos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "parto_candidatos_pai" ADD CONSTRAINT "FK_b57956aa09648107afd963a2dfa" FOREIGN KEY ("touro_id") REFERENCES "animais"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "parto_candidatos_pai" ADD CONSTRAINT "FK_b88c6bccc3b7c1b1de0fde9f932" FOREIGN KEY ("semen_id") REFERENCES "semens"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "partos" ADD CONSTRAINT "FK_132eece354923c38fb3d6bc665d" FOREIGN KEY ("mae_id") REFERENCES "animais"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "partos" ADD CONSTRAINT "FK_a7e5097d1972cb77ec35957c748" FOREIGN KEY ("inseminacao_id") REFERENCES "inseminacoes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "partos" ADD CONSTRAINT "FK_9766e31c681ec5f6b309a6eb3df" FOREIGN KEY ("criado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "partos" ADD CONSTRAINT "FK_c727df5dd7bfc2d1cb9f3eb930d" FOREIGN KEY ("atualizado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "animais" ADD CONSTRAINT "FK_c7647d64ef235327399b3ff6b25" FOREIGN KEY ("fazenda_id") REFERENCES "fazendas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "animais" ADD CONSTRAINT "FK_6b30f87a623b1e7a46b6898f827" FOREIGN KEY ("parto_id") REFERENCES "partos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "animais" ADD CONSTRAINT "FK_ddf01d3cffd7b9fe929810dedcc" FOREIGN KEY ("raca_id") REFERENCES "racas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "animais" ADD CONSTRAINT "FK_feb4f39523a3b94d10eb4ac4332" FOREIGN KEY ("mae_id") REFERENCES "animais"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "animais" ADD CONSTRAINT "FK_422f35f6f15dd57d275133007c7" FOREIGN KEY ("pai_id") REFERENCES "animais"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "animais" ADD CONSTRAINT "FK_79abad39632f18091b900e46ede" FOREIGN KEY ("pai_semen_id") REFERENCES "semens"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "animais" ADD CONSTRAINT "FK_ec4f247dc7b9b7495e61fdf2208" FOREIGN KEY ("pasto_atual_id") REFERENCES "pastos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "animais" ADD CONSTRAINT "FK_ed1ebf33b0fd578b869b4a681ed" FOREIGN KEY ("criado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "animais" ADD CONSTRAINT "FK_3b5bb80c2b086549b617ba612d6" FOREIGN KEY ("atualizado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "codigos_identificacao" ADD CONSTRAINT "FK_fe36187f4a7f08399f6d3698cc1" FOREIGN KEY ("fazenda_id") REFERENCES "fazendas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "codigos_identificacao" ADD CONSTRAINT "FK_b1cc398c02a649fb4b22d498817" FOREIGN KEY ("animal_id") REFERENCES "animais"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "codigos_identificacao" ADD CONSTRAINT "FK_04424da41830e289a6170032ec2" FOREIGN KEY ("criado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "historico_numero" ADD CONSTRAINT "FK_ea2fc678fe37fb277a2170d4d93" FOREIGN KEY ("fazenda_id") REFERENCES "fazendas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "historico_numero" ADD CONSTRAINT "FK_fe7c62269195164c5058cc64864" FOREIGN KEY ("animal_id") REFERENCES "animais"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "historico_numero" ADD CONSTRAINT "FK_795a063e1e24f9d19066d5b8bff" FOREIGN KEY ("reemitido_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "configuracoes_fazenda" ADD CONSTRAINT "FK_ad7b0cae85143bc0c7829bc8491" FOREIGN KEY ("fazenda_id") REFERENCES "fazendas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "valores_arroba_categoria" ADD CONSTRAINT "FK_06cbcca776bdb97d3f8447b804d" FOREIGN KEY ("configuracao_fazenda_id") REFERENCES "configuracoes_fazenda"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessoes_manejo" ADD CONSTRAINT "FK_33e9c6d268e3306cdd21196f20c" FOREIGN KEY ("fazenda_id") REFERENCES "fazendas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessoes_manejo" ADD CONSTRAINT "FK_8aa3c4967c1888626c50cf423bb" FOREIGN KEY ("filtro_pasto_id") REFERENCES "pastos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessoes_manejo" ADD CONSTRAINT "FK_50d57c7a14d712012e4f1e9a7b6" FOREIGN KEY ("pasto_destino_id") REFERENCES "pastos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessoes_manejo" ADD CONSTRAINT "FK_4453a272763e556e7294bccb3c8" FOREIGN KEY ("criado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessoes_manejo_excecoes" ADD CONSTRAINT "FK_9dd36a87b8bbc3203eb7964e275" FOREIGN KEY ("sessao_id") REFERENCES "sessoes_manejo"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessoes_manejo_excecoes" ADD CONSTRAINT "FK_a02fb2c0956cbdf806490924e34" FOREIGN KEY ("animal_id") REFERENCES "animais"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "movimentacoes_pasto" ADD CONSTRAINT "FK_35212d29c623d93dfe3dd75af96" FOREIGN KEY ("animal_id") REFERENCES "animais"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "movimentacoes_pasto" ADD CONSTRAINT "FK_a7a344175cee36f66534decebd8" FOREIGN KEY ("pasto_id") REFERENCES "pastos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "movimentacoes_pasto" ADD CONSTRAINT "FK_a853769cce78de2bee2229a7fa9" FOREIGN KEY ("criado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "pesagens" ADD CONSTRAINT "FK_f5b2bf44e1e6025248336df3877" FOREIGN KEY ("animal_id") REFERENCES "animais"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "pesagens" ADD CONSTRAINT "FK_32947b088022695c0da2a06ee79" FOREIGN KEY ("pesado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "pesagens" ADD CONSTRAINT "FK_32a4330146e1e8828925210c89d" FOREIGN KEY ("lancado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "diagnosticos_gestacao" ADD CONSTRAINT "FK_d254fff1072d7f03aaab40d1b65" FOREIGN KEY ("criado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "diagnosticos_gestacao" ADD CONSTRAINT "FK_72d0aaa1b7e4def5c859d455171" FOREIGN KEY ("atualizado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "diagnosticos_gestacao" ADD CONSTRAINT "FK_9d3bb1013d17362116d14c8290a" FOREIGN KEY ("femea_id") REFERENCES "animais"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "diagnosticos_gestacao" ADD CONSTRAINT "FK_9b57016505dd7d91fe89239fc56" FOREIGN KEY ("feito_por_usuario_id") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "diagnosticos_gestacao" ADD CONSTRAINT "FK_3c06eb29b0b9e69f915b6c1d578" FOREIGN KEY ("feito_por_veterinario_id") REFERENCES "veterinarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exposicoes_monta" ADD CONSTRAINT "FK_51f6607c04e55edeee16661b781" FOREIGN KEY ("criado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exposicoes_monta" ADD CONSTRAINT "FK_770d03e7c405c7de67db692a543" FOREIGN KEY ("atualizado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exposicoes_monta" ADD CONSTRAINT "FK_63d557575031e15ab6e2bbde891" FOREIGN KEY ("estacao_id") REFERENCES "estacoes_monta"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "exposicoes_monta" ADD CONSTRAINT "FK_e64397a7ed81e56ff4fd1e55d3b" FOREIGN KEY ("femea_id") REFERENCES "animais"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "excecoes_estacao_monta" ADD CONSTRAINT "FK_dcc9307181a5e0a7a85d1abc6a0" FOREIGN KEY ("estacao_id") REFERENCES "estacoes_monta"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "excecoes_estacao_monta" ADD CONSTRAINT "FK_06013c5d525c2a0ef0f1c7e2f37" FOREIGN KEY ("femea_id") REFERENCES "animais"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "estacoes_monta" ADD CONSTRAINT "FK_3fd3d3ce4a01e3962f9ba0c92d0" FOREIGN KEY ("criado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "estacoes_monta" ADD CONSTRAINT "FK_f119f6282f123fe0897fdcca55b" FOREIGN KEY ("atualizado_por") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "estacoes_monta" ADD CONSTRAINT "FK_3e660c70c000da24ea1bd8a1cb7" FOREIGN KEY ("fazenda_id") REFERENCES "fazendas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "estacoes_monta" ADD CONSTRAINT "FK_f253f0b63f37f910b86315bf78f" FOREIGN KEY ("touro_id") REFERENCES "animais"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "estacoes_monta" ADD CONSTRAINT "FK_814b58caec5f988e22a9882bef6" FOREIGN KEY ("pasto_id") REFERENCES "pastos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  // ATENÇÃO: desfazer esta migration apaga TODAS as tabelas e dados.
  // Só existe para completar o par up/down; nunca rode em banco com dados reais.
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "estacoes_monta" DROP CONSTRAINT "FK_814b58caec5f988e22a9882bef6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "estacoes_monta" DROP CONSTRAINT "FK_f253f0b63f37f910b86315bf78f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "estacoes_monta" DROP CONSTRAINT "FK_3e660c70c000da24ea1bd8a1cb7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "estacoes_monta" DROP CONSTRAINT "FK_f119f6282f123fe0897fdcca55b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "estacoes_monta" DROP CONSTRAINT "FK_3fd3d3ce4a01e3962f9ba0c92d0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "excecoes_estacao_monta" DROP CONSTRAINT "FK_06013c5d525c2a0ef0f1c7e2f37"`,
    );
    await queryRunner.query(
      `ALTER TABLE "excecoes_estacao_monta" DROP CONSTRAINT "FK_dcc9307181a5e0a7a85d1abc6a0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exposicoes_monta" DROP CONSTRAINT "FK_e64397a7ed81e56ff4fd1e55d3b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exposicoes_monta" DROP CONSTRAINT "FK_63d557575031e15ab6e2bbde891"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exposicoes_monta" DROP CONSTRAINT "FK_770d03e7c405c7de67db692a543"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exposicoes_monta" DROP CONSTRAINT "FK_51f6607c04e55edeee16661b781"`,
    );
    await queryRunner.query(
      `ALTER TABLE "diagnosticos_gestacao" DROP CONSTRAINT "FK_3c06eb29b0b9e69f915b6c1d578"`,
    );
    await queryRunner.query(
      `ALTER TABLE "diagnosticos_gestacao" DROP CONSTRAINT "FK_9b57016505dd7d91fe89239fc56"`,
    );
    await queryRunner.query(
      `ALTER TABLE "diagnosticos_gestacao" DROP CONSTRAINT "FK_9d3bb1013d17362116d14c8290a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "diagnosticos_gestacao" DROP CONSTRAINT "FK_72d0aaa1b7e4def5c859d455171"`,
    );
    await queryRunner.query(
      `ALTER TABLE "diagnosticos_gestacao" DROP CONSTRAINT "FK_d254fff1072d7f03aaab40d1b65"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pesagens" DROP CONSTRAINT "FK_32a4330146e1e8828925210c89d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pesagens" DROP CONSTRAINT "FK_32947b088022695c0da2a06ee79"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pesagens" DROP CONSTRAINT "FK_f5b2bf44e1e6025248336df3877"`,
    );
    await queryRunner.query(
      `ALTER TABLE "movimentacoes_pasto" DROP CONSTRAINT "FK_a853769cce78de2bee2229a7fa9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "movimentacoes_pasto" DROP CONSTRAINT "FK_a7a344175cee36f66534decebd8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "movimentacoes_pasto" DROP CONSTRAINT "FK_35212d29c623d93dfe3dd75af96"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessoes_manejo_excecoes" DROP CONSTRAINT "FK_a02fb2c0956cbdf806490924e34"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessoes_manejo_excecoes" DROP CONSTRAINT "FK_9dd36a87b8bbc3203eb7964e275"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessoes_manejo" DROP CONSTRAINT "FK_4453a272763e556e7294bccb3c8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessoes_manejo" DROP CONSTRAINT "FK_50d57c7a14d712012e4f1e9a7b6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessoes_manejo" DROP CONSTRAINT "FK_8aa3c4967c1888626c50cf423bb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessoes_manejo" DROP CONSTRAINT "FK_33e9c6d268e3306cdd21196f20c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "valores_arroba_categoria" DROP CONSTRAINT "FK_06cbcca776bdb97d3f8447b804d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "configuracoes_fazenda" DROP CONSTRAINT "FK_ad7b0cae85143bc0c7829bc8491"`,
    );
    await queryRunner.query(
      `ALTER TABLE "historico_numero" DROP CONSTRAINT "FK_795a063e1e24f9d19066d5b8bff"`,
    );
    await queryRunner.query(
      `ALTER TABLE "historico_numero" DROP CONSTRAINT "FK_fe7c62269195164c5058cc64864"`,
    );
    await queryRunner.query(
      `ALTER TABLE "historico_numero" DROP CONSTRAINT "FK_ea2fc678fe37fb277a2170d4d93"`,
    );
    await queryRunner.query(
      `ALTER TABLE "codigos_identificacao" DROP CONSTRAINT "FK_04424da41830e289a6170032ec2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "codigos_identificacao" DROP CONSTRAINT "FK_b1cc398c02a649fb4b22d498817"`,
    );
    await queryRunner.query(
      `ALTER TABLE "codigos_identificacao" DROP CONSTRAINT "FK_fe36187f4a7f08399f6d3698cc1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "animais" DROP CONSTRAINT "FK_3b5bb80c2b086549b617ba612d6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "animais" DROP CONSTRAINT "FK_ed1ebf33b0fd578b869b4a681ed"`,
    );
    await queryRunner.query(
      `ALTER TABLE "animais" DROP CONSTRAINT "FK_ec4f247dc7b9b7495e61fdf2208"`,
    );
    await queryRunner.query(
      `ALTER TABLE "animais" DROP CONSTRAINT "FK_79abad39632f18091b900e46ede"`,
    );
    await queryRunner.query(
      `ALTER TABLE "animais" DROP CONSTRAINT "FK_422f35f6f15dd57d275133007c7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "animais" DROP CONSTRAINT "FK_feb4f39523a3b94d10eb4ac4332"`,
    );
    await queryRunner.query(
      `ALTER TABLE "animais" DROP CONSTRAINT "FK_ddf01d3cffd7b9fe929810dedcc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "animais" DROP CONSTRAINT "FK_6b30f87a623b1e7a46b6898f827"`,
    );
    await queryRunner.query(
      `ALTER TABLE "animais" DROP CONSTRAINT "FK_c7647d64ef235327399b3ff6b25"`,
    );
    await queryRunner.query(
      `ALTER TABLE "partos" DROP CONSTRAINT "FK_c727df5dd7bfc2d1cb9f3eb930d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "partos" DROP CONSTRAINT "FK_9766e31c681ec5f6b309a6eb3df"`,
    );
    await queryRunner.query(
      `ALTER TABLE "partos" DROP CONSTRAINT "FK_a7e5097d1972cb77ec35957c748"`,
    );
    await queryRunner.query(
      `ALTER TABLE "partos" DROP CONSTRAINT "FK_132eece354923c38fb3d6bc665d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "parto_candidatos_pai" DROP CONSTRAINT "FK_b88c6bccc3b7c1b1de0fde9f932"`,
    );
    await queryRunner.query(
      `ALTER TABLE "parto_candidatos_pai" DROP CONSTRAINT "FK_b57956aa09648107afd963a2dfa"`,
    );
    await queryRunner.query(
      `ALTER TABLE "parto_candidatos_pai" DROP CONSTRAINT "FK_8242ca7a4569729b8ac72ca567c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inseminacoes" DROP CONSTRAINT "FK_4d7535954cf3c92417c500be8c0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inseminacoes" DROP CONSTRAINT "FK_d8ecdd6542645ea848d3b88aa62"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inseminacoes" DROP CONSTRAINT "FK_cbb5e72e285a8153806f3ec9aa8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inseminacoes" DROP CONSTRAINT "FK_8fe30ca95510d0c71867ad4a8af"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inseminacoes" DROP CONSTRAINT "FK_829ab50ad4a5d9ff4e7ba5db0ad"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inseminacoes" DROP CONSTRAINT "FK_386867256a4db01465f05eae326"`,
    );
    await queryRunner.query(
      `ALTER TABLE "semens" DROP CONSTRAINT "FK_cb9d5687365ba5ae2301b24d8a8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "semens" DROP CONSTRAINT "FK_d0a90a9d6cfa693e54279d6e050"`,
    );
    await queryRunner.query(
      `ALTER TABLE "semens" DROP CONSTRAINT "FK_1c4b3f042d2df4135137ae58946"`,
    );
    await queryRunner.query(
      `ALTER TABLE "semens" DROP CONSTRAINT "FK_685cc970df1b8928ab40372911d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tratamentos" DROP CONSTRAINT "FK_f59368ff74f742abffe0adf2d42"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tratamentos" DROP CONSTRAINT "FK_33216123b3e1bff6f8d9c821f7c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tratamentos" DROP CONSTRAINT "FK_964b00330c7ce7da63a0be90918"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tratamentos" DROP CONSTRAINT "FK_28e8669e7d786a3a1c444edd4c6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tratamentos" DROP CONSTRAINT "FK_770c642d33d7e8500afc753a30f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "veterinarios" DROP CONSTRAINT "FK_070a6847dba779eab819bb2461c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "veterinarios" DROP CONSTRAINT "FK_7b1f53b73b5ce3c1f6a3f3f8a43"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pastos" DROP CONSTRAINT "FK_dd9acc728fd9ef5d1c7f6844809"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pastos" DROP CONSTRAINT "FK_5f4adddec9d53809bfb251eef44"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pastos" DROP CONSTRAINT "FK_01f2a18831867f120e3575cb1d6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "racas" DROP CONSTRAINT "FK_137c9075da886e8bd7bec2d4147"`,
    );
    await queryRunner.query(
      `ALTER TABLE "racas" DROP CONSTRAINT "FK_5efaa0b0f437fd60637492250b8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios" DROP CONSTRAINT "FK_20b8f3eee215f8f932e299b6b84"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios" DROP CONSTRAINT "FK_8e918a3b3a64f2ddbcc40984449"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios" DROP CONSTRAINT "FK_bb0ff6196a6f2413728d511a83b"`,
    );
    await queryRunner.query(`DROP TABLE "estacoes_monta"`);
    await queryRunner.query(
      `DROP TYPE "public"."estacoes_monta_motivo_encerramento_enum"`,
    );
    await queryRunner.query(`DROP TABLE "excecoes_estacao_monta"`);
    await queryRunner.query(`DROP TABLE "exposicoes_monta"`);
    await queryRunner.query(
      `DROP TYPE "public"."exposicoes_monta_motivo_fim_enum"`,
    );
    await queryRunner.query(`DROP TABLE "diagnosticos_gestacao"`);
    await queryRunner.query(
      `DROP TYPE "public"."diagnosticos_gestacao_feito_por_tipo_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."diagnosticos_gestacao_metodo_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."diagnosticos_gestacao_resultado_enum"`,
    );
    await queryRunner.query(`DROP TABLE "pesagens"`);
    await queryRunner.query(`DROP TABLE "movimentacoes_pasto"`);
    await queryRunner.query(`DROP TABLE "sessoes_manejo_excecoes"`);
    await queryRunner.query(`DROP TABLE "sessoes_manejo"`);
    await queryRunner.query(
      `DROP TYPE "public"."sessoes_manejo_filtro_categoria_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."sessoes_manejo_tipo_enum"`);
    await queryRunner.query(`DROP TABLE "valores_arroba_categoria"`);
    await queryRunner.query(
      `DROP TYPE "public"."valores_arroba_categoria_categoria_enum"`,
    );
    await queryRunner.query(`DROP TABLE "configuracoes_fazenda"`);
    await queryRunner.query(
      `DROP TYPE "public"."configuracoes_fazenda_som_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_664a30a67150c0ae0c00f0662b"`,
    );
    await queryRunner.query(`DROP TABLE "historico_numero"`);
    await queryRunner.query(`DROP TABLE "codigos_identificacao"`);
    await queryRunner.query(
      `DROP TYPE "public"."codigos_identificacao_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "animais"`);
    await queryRunner.query(`DROP TYPE "public"."animais_origem_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."animais_status_reprodutivo_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."animais_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."animais_categoria_enum"`);
    await queryRunner.query(`DROP TYPE "public"."animais_sexo_enum"`);
    await queryRunner.query(`DROP TABLE "partos"`);
    await queryRunner.query(`DROP TYPE "public"."partos_tipo_enum"`);
    await queryRunner.query(`DROP TYPE "public"."partos_resultado_enum"`);
    await queryRunner.query(`DROP TABLE "parto_candidatos_pai"`);
    await queryRunner.query(`DROP TABLE "inseminacoes"`);
    await queryRunner.query(
      `DROP TYPE "public"."inseminacoes_aplicado_por_tipo_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."inseminacoes_tipo_enum"`);
    await queryRunner.query(`DROP TABLE "semens"`);
    await queryRunner.query(`DROP TABLE "tratamentos"`);
    await queryRunner.query(
      `DROP TYPE "public"."tratamentos_aplicado_por_tipo_enum"`,
    );
    await queryRunner.query(`DROP TABLE "veterinarios"`);
    await queryRunner.query(`DROP TABLE "pastos"`);
    await queryRunner.query(`DROP TABLE "racas"`);
    await queryRunner.query(`DROP TABLE "usuarios"`);
    await queryRunner.query(`DROP TYPE "public"."usuarios_papel_enum"`);
    await queryRunner.query(`DROP TABLE "fazendas"`);
  }
}
