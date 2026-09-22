import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1790059369013 implements MigrationInterface {
    name = 'InitialSchema1790059369013'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "events" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "project_id" uuid NOT NULL,
                "type" character varying(100) NOT NULL,
                "payload" jsonb NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_40731c7151fe4be3116e45ddf73" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_events_project_created_at" ON "events" ("project_id", "created_at")
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."delivery_status" AS ENUM('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED')
        `);
        await queryRunner.query(`
            CREATE TABLE "deliveries" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "event_id" uuid NOT NULL,
                "webhook_endpoint_id" uuid NOT NULL,
                "target_url" text NOT NULL,
                "attempt_number" integer NOT NULL DEFAULT '1',
                "status" "public"."delivery_status" NOT NULL DEFAULT 'PENDING',
                "http_status_code" smallint,
                "response_body" text,
                "error_message" text,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "started_at" TIMESTAMP WITH TIME ZONE,
                "finished_at" TIMESTAMP WITH TIME ZONE,
                CONSTRAINT "CHK_deliveries_attempt_number" CHECK ("attempt_number" >= 1),
                CONSTRAINT "PK_a6ef225c5c5f0974e503bfb731f" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_deliveries_webhook_endpoint_id" ON "deliveries" ("webhook_endpoint_id")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "UQ_deliveries_event_endpoint_attempt" ON "deliveries" (
                "event_id",
                "webhook_endpoint_id",
                "attempt_number"
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "webhook_endpoints" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "project_id" uuid NOT NULL,
                "name" character varying(100) NOT NULL,
                "url" text NOT NULL,
                "is_active" boolean NOT NULL DEFAULT true,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP WITH TIME ZONE,
                CONSTRAINT "PK_054c4cfb95223732f5939d2d546" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_webhook_endpoints_project_id" ON "webhook_endpoints" ("project_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "projects" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "user_id" uuid NOT NULL,
                "name" character varying(100) NOT NULL,
                "description" text,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_6271df0a7aed1d6c0691ce6ac50" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_projects_user_id" ON "projects" ("user_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "users" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "email" character varying(255) NOT NULL,
                "password_hash" text NOT NULL,
                "name" character varying(100) NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"),
                CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "events"
            ADD CONSTRAINT "FK_eb39d823959d74ba918a17636b3" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "deliveries"
            ADD CONSTRAINT "FK_6a9b04f909fedcc6438b48b90c1" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "deliveries"
            ADD CONSTRAINT "FK_0284a20561ba159f2052d72bb68" FOREIGN KEY ("webhook_endpoint_id") REFERENCES "webhook_endpoints"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "webhook_endpoints"
            ADD CONSTRAINT "FK_0ab4ea705a813fdebcc2b12ef2f" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "projects"
            ADD CONSTRAINT "FK_bd55b203eb9f92b0c8390380010" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "projects" DROP CONSTRAINT "FK_bd55b203eb9f92b0c8390380010"
        `);
        await queryRunner.query(`
            ALTER TABLE "webhook_endpoints" DROP CONSTRAINT "FK_0ab4ea705a813fdebcc2b12ef2f"
        `);
        await queryRunner.query(`
            ALTER TABLE "deliveries" DROP CONSTRAINT "FK_0284a20561ba159f2052d72bb68"
        `);
        await queryRunner.query(`
            ALTER TABLE "deliveries" DROP CONSTRAINT "FK_6a9b04f909fedcc6438b48b90c1"
        `);
        await queryRunner.query(`
            ALTER TABLE "events" DROP CONSTRAINT "FK_eb39d823959d74ba918a17636b3"
        `);
        await queryRunner.query(`
            DROP TABLE "users"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_projects_user_id"
        `);
        await queryRunner.query(`
            DROP TABLE "projects"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_webhook_endpoints_project_id"
        `);
        await queryRunner.query(`
            DROP TABLE "webhook_endpoints"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."UQ_deliveries_event_endpoint_attempt"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_deliveries_webhook_endpoint_id"
        `);
        await queryRunner.query(`
            DROP TABLE "deliveries"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."delivery_status"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_events_project_created_at"
        `);
        await queryRunner.query(`
            DROP TABLE "events"
        `);
    }

}
