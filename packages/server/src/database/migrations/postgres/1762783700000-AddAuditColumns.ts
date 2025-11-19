import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAuditColumns1762783700000 implements MigrationInterface {
    name = 'AddAuditColumns1762783700000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Добавляем audit колонки в таблицу user
        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'createdDate') THEN
                    ALTER TABLE "user" ADD COLUMN "createdDate" timestamp;
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'updatedDate') THEN
                    ALTER TABLE "user" ADD COLUMN "updatedDate" timestamp;
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'createdBy') THEN
                    ALTER TABLE "user" ADD COLUMN "createdBy" varchar;
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'updatedBy') THEN
                    ALTER TABLE "user" ADD COLUMN "updatedBy" varchar;
                END IF;
            END $$;
        `)

        // Добавляем audit колонки в таблицу organization
        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organization' AND column_name = 'createdDate') THEN
                    ALTER TABLE "organization" ADD COLUMN "createdDate" timestamp;
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organization' AND column_name = 'updatedDate') THEN
                    ALTER TABLE "organization" ADD COLUMN "updatedDate" timestamp;
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organization' AND column_name = 'createdBy') THEN
                    ALTER TABLE "organization" ADD COLUMN "createdBy" varchar;
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organization' AND column_name = 'updatedBy') THEN
                    ALTER TABLE "organization" ADD COLUMN "updatedBy" varchar;
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organization' AND column_name = 'subscriptionId') THEN
                    ALTER TABLE "organization" ADD COLUMN "subscriptionId" varchar;
                END IF;
            END $$;
        `)

        // Добавляем audit колонки в таблицу workspace
        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspace' AND column_name = 'createdDate') THEN
                    ALTER TABLE "workspace" ADD COLUMN "createdDate" timestamp;
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspace' AND column_name = 'updatedDate') THEN
                    ALTER TABLE "workspace" ADD COLUMN "updatedDate" timestamp;
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspace' AND column_name = 'createdBy') THEN
                    ALTER TABLE "workspace" ADD COLUMN "createdBy" varchar;
                END IF;
                
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspace' AND column_name = 'updatedBy') THEN
                    ALTER TABLE "workspace" ADD COLUMN "updatedBy" varchar;
                END IF;
            END $$;
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Удаляем audit колонки из таблицы user
        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'createdDate') THEN
                    ALTER TABLE "user" DROP COLUMN "createdDate";
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'updatedDate') THEN
                    ALTER TABLE "user" DROP COLUMN "updatedDate";
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'createdBy') THEN
                    ALTER TABLE "user" DROP COLUMN "createdBy";
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'updatedBy') THEN
                    ALTER TABLE "user" DROP COLUMN "updatedBy";
                END IF;
            END $$;
        `)

        // Удаляем audit колонки из таблицы organization
        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organization' AND column_name = 'createdDate') THEN
                    ALTER TABLE "organization" DROP COLUMN "createdDate";
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organization' AND column_name = 'updatedDate') THEN
                    ALTER TABLE "organization" DROP COLUMN "updatedDate";
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organization' AND column_name = 'createdBy') THEN
                    ALTER TABLE "organization" DROP COLUMN "createdBy";
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organization' AND column_name = 'updatedBy') THEN
                    ALTER TABLE "organization" DROP COLUMN "updatedBy";
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organization' AND column_name = 'subscriptionId') THEN
                    ALTER TABLE "organization" DROP COLUMN "subscriptionId";
                END IF;
            END $$;
        `)

        // Удаляем audit колонки из таблицы workspace
        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspace' AND column_name = 'createdDate') THEN
                    ALTER TABLE "workspace" DROP COLUMN "createdDate";
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspace' AND column_name = 'updatedDate') THEN
                    ALTER TABLE "workspace" DROP COLUMN "updatedDate";
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspace' AND column_name = 'createdBy') THEN
                    ALTER TABLE "workspace" DROP COLUMN "createdBy";
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspace' AND column_name = 'updatedBy') THEN
                    ALTER TABLE "workspace" DROP COLUMN "updatedBy";
                END IF;
            END $$;
        `)
    }
}

