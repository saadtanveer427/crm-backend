import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterActivityLogEntity1775105138122 implements MigrationInterface {
    name = 'AlterActivityLogEntity1775105138122'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "customers" DROP CONSTRAINT "FK_d2fc0e42b07d01fafc3fbb2bee3"`);
        await queryRunner.query(`ALTER TABLE "customers" DROP CONSTRAINT "FK_11d81cd7be87b6f8865b0cf7661"`);
        await queryRunner.query(`ALTER TABLE "activity_logs" DROP CONSTRAINT "FK_f2a5695f730cbe9bf16eeb74342"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_845b367294d44fadbf6c0d86cf"`);
        await queryRunner.query(`ALTER TABLE "activity_logs" ALTER COLUMN "organization_id" DROP NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_845b367294d44fadbf6c0d86cf" ON "activity_logs" ("organization_id", "entity_id") `);
        await queryRunner.query(`ALTER TABLE "customers" ADD CONSTRAINT "FK_d2fc0e42b07d01fafc3fbb2bee3" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "customers" ADD CONSTRAINT "FK_11d81cd7be87b6f8865b0cf7661" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "activity_logs" ADD CONSTRAINT "FK_f2a5695f730cbe9bf16eeb74342" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "activity_logs" DROP CONSTRAINT "FK_f2a5695f730cbe9bf16eeb74342"`);
        await queryRunner.query(`ALTER TABLE "customers" DROP CONSTRAINT "FK_11d81cd7be87b6f8865b0cf7661"`);
        await queryRunner.query(`ALTER TABLE "customers" DROP CONSTRAINT "FK_d2fc0e42b07d01fafc3fbb2bee3"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_845b367294d44fadbf6c0d86cf"`);
        await queryRunner.query(`ALTER TABLE "activity_logs" ALTER COLUMN "organization_id" SET NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_845b367294d44fadbf6c0d86cf" ON "activity_logs" ("entity_id", "organization_id") `);
        await queryRunner.query(`ALTER TABLE "activity_logs" ADD CONSTRAINT "FK_f2a5695f730cbe9bf16eeb74342" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "customers" ADD CONSTRAINT "FK_11d81cd7be87b6f8865b0cf7661" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "customers" ADD CONSTRAINT "FK_d2fc0e42b07d01fafc3fbb2bee3" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
