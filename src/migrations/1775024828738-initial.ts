import { MigrationInterface, QueryRunner } from "typeorm";

export class Initial1775024828738 implements MigrationInterface {
    name = 'Initial1775024828738'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "organization" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, CONSTRAINT "UQ_c21e615583a3ebbb0977452afb0" UNIQUE ("name"), CONSTRAINT "PK_472c1f99a32def1b0abb219cd67" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "notes" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "content" text NOT NULL, "customer_id" uuid NOT NULL, "created_by_id" uuid, "organization_id" uuid NOT NULL, CONSTRAINT "PK_af6206538ea96c4e77e9f400c3d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e04c36c14bc9f01f84cd7655b6" ON "notes" ("customer_id") `);
        await queryRunner.query(`CREATE TABLE "customers" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "email" character varying NOT NULL, "phone" character varying, "organization_id" uuid NOT NULL, "user_id" uuid, CONSTRAINT "PK_133ec679a801fab5e070f73d3ea" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_144c1ebc37b258c4f9936624fc" ON "customers" ("organization_id", "created_at") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_fd8ff15d87714c6b6b955262c1" ON "customers" ("organization_id", "email") `);
        await queryRunner.query(`CREATE INDEX "IDX_361f73d0c1c7fd2722cd69f21a" ON "customers" ("user_id", "deleted_at") `);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('admin', 'member')`);
        await queryRunner.query(`CREATE TABLE "users" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "email" character varying NOT NULL, "role" "public"."users_role_enum" NOT NULL, "organization_id" uuid NOT NULL, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_21a659804ed7bf61eb91688dea" ON "users" ("organization_id") `);
        await queryRunner.query(`CREATE TYPE "public"."activity_logs_action_enum" AS ENUM('created', 'updated', 'deleted', 'restored', 'assigned', 'note_added')`);
        await queryRunner.query(`CREATE TABLE "activity_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "entity_type" character varying NOT NULL, "entity_id" character varying NOT NULL, "action" "public"."activity_logs_action_enum" NOT NULL, "user_id" uuid, "organization_id" uuid NOT NULL, "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "performed_by_id" uuid, CONSTRAINT "PK_f25287b6140c5ba18d38776a796" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_845b367294d44fadbf6c0d86cf" ON "activity_logs" ("organization_id", "entity_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_cd64e0e98220d39e897f3d3e3e" ON "activity_logs" ("entity_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_f2a5695f730cbe9bf16eeb7434" ON "activity_logs" ("organization_id") `);
        await queryRunner.query(`ALTER TABLE "notes" ADD CONSTRAINT "FK_e04c36c14bc9f01f84cd7655b68" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notes" ADD CONSTRAINT "FK_955333ff7758dfad6c897f887bb" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notes" ADD CONSTRAINT "FK_67ac36febe55675fe7e04b53b53" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "customers" ADD CONSTRAINT "FK_d2fc0e42b07d01fafc3fbb2bee3" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "customers" ADD CONSTRAINT "FK_11d81cd7be87b6f8865b0cf7661" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_21a659804ed7bf61eb91688dea7" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "activity_logs" ADD CONSTRAINT "FK_f3ae221e1012294853ee4bd5879" FOREIGN KEY ("performed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "activity_logs" ADD CONSTRAINT "FK_f2a5695f730cbe9bf16eeb74342" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "activity_logs" DROP CONSTRAINT "FK_f2a5695f730cbe9bf16eeb74342"`);
        await queryRunner.query(`ALTER TABLE "activity_logs" DROP CONSTRAINT "FK_f3ae221e1012294853ee4bd5879"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_21a659804ed7bf61eb91688dea7"`);
        await queryRunner.query(`ALTER TABLE "customers" DROP CONSTRAINT "FK_11d81cd7be87b6f8865b0cf7661"`);
        await queryRunner.query(`ALTER TABLE "customers" DROP CONSTRAINT "FK_d2fc0e42b07d01fafc3fbb2bee3"`);
        await queryRunner.query(`ALTER TABLE "notes" DROP CONSTRAINT "FK_67ac36febe55675fe7e04b53b53"`);
        await queryRunner.query(`ALTER TABLE "notes" DROP CONSTRAINT "FK_955333ff7758dfad6c897f887bb"`);
        await queryRunner.query(`ALTER TABLE "notes" DROP CONSTRAINT "FK_e04c36c14bc9f01f84cd7655b68"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f2a5695f730cbe9bf16eeb7434"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cd64e0e98220d39e897f3d3e3e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_845b367294d44fadbf6c0d86cf"`);
        await queryRunner.query(`DROP TABLE "activity_logs"`);
        await queryRunner.query(`DROP TYPE "public"."activity_logs_action_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_21a659804ed7bf61eb91688dea"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_361f73d0c1c7fd2722cd69f21a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fd8ff15d87714c6b6b955262c1"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_144c1ebc37b258c4f9936624fc"`);
        await queryRunner.query(`DROP TABLE "customers"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e04c36c14bc9f01f84cd7655b6"`);
        await queryRunner.query(`DROP TABLE "notes"`);
        await queryRunner.query(`DROP TABLE "organization"`);
    }

}
