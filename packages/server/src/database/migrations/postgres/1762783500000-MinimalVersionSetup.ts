import { MigrationInterface, QueryRunner } from 'typeorm'

export class MinimalVersionSetup1762783500000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Создаем таблицу ролей если её нет
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS role (
                id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                name varchar NOT NULL,
                "organizationId" varchar,
                permissions text DEFAULT '[]',
                "createdBy" varchar,
                "updatedBy" varchar
            );
        `)

        // 2. Создаем таблицу организаций если её нет
        await queryRunner.query(`
            ALTER TABLE organization ADD COLUMN IF NOT EXISTS "subscriptionId" varchar;
            ALTER TABLE organization ADD COLUMN IF NOT EXISTS "customerId" varchar;
            ALTER TABLE organization ADD COLUMN IF NOT EXISTS "createdBy" varchar;
            ALTER TABLE organization ADD COLUMN IF NOT EXISTS "updatedBy" varchar;
        `)

        // 3. Создаем таблицу workspace если её нет (уже создается миграциями)
        await queryRunner.query(`
            ALTER TABLE workspace ADD COLUMN IF NOT EXISTS "createdBy" varchar;
            ALTER TABLE workspace ADD COLUMN IF NOT EXISTS "updatedBy" varchar;
        `)

        // 4. Создаем таблицу organization_user
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS organization_user (
                "organizationId" uuid NOT NULL,
                "userId" uuid NOT NULL,
                "roleId" uuid,
                status varchar,
                "createdBy" varchar,
                "updatedBy" varchar,
                PRIMARY KEY ("organizationId", "userId")
            );
        `)

        // 5. Создаем таблицу workspace_user
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS workspace_user (
                "workspaceId" uuid NOT NULL,
                "userId" uuid NOT NULL,
                "roleId" uuid,
                status varchar,
                "lastLogin" timestamp,
                "updatedBy" varchar,
                "createdBy" varchar,
                PRIMARY KEY ("workspaceId", "userId")
            );
        `)

        // 6. Добавляем недостающие поля в таблицу user
        await queryRunner.query(`
            ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "createdBy" varchar;
            ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "updatedBy" varchar;
        `)

        // 7. Вставляем базовые роли (если их нет)
        await queryRunner.query(`
            INSERT INTO role (id, name, "organizationId", permissions) 
            SELECT uuid_generate_v4(), 'OWNER', NULL, '[]'
            WHERE NOT EXISTS (SELECT 1 FROM role WHERE name = 'OWNER');

            INSERT INTO role (id, name, "organizationId", permissions) 
            SELECT uuid_generate_v4(), 'ADMIN', NULL, '[]'
            WHERE NOT EXISTS (SELECT 1 FROM role WHERE name = 'ADMIN');

            INSERT INTO role (id, name, "organizationId", permissions) 
            SELECT uuid_generate_v4(), 'EDITOR', NULL, '[]'
            WHERE NOT EXISTS (SELECT 1 FROM role WHERE name = 'EDITOR');

            INSERT INTO role (id, name, "organizationId", permissions) 
            SELECT uuid_generate_v4(), 'VIEWER', NULL, '[]'
            WHERE NOT EXISTS (SELECT 1 FROM role WHERE name = 'VIEWER');

            INSERT INTO role (id, name, "organizationId", permissions) 
            SELECT uuid_generate_v4(), 'MEMBER', NULL, '[]'
            WHERE NOT EXISTS (SELECT 1 FROM role WHERE name = 'MEMBER');

            INSERT INTO role (id, name, "organizationId", permissions) 
            SELECT uuid_generate_v4(), 'PERSONAL_WORKSPACE', NULL, '[]'
            WHERE NOT EXISTS (SELECT 1 FROM role WHERE name = 'PERSONAL_WORKSPACE');
        `)

        // 8. Создаем дефолтную организацию (если её нет)
        await queryRunner.query(`
            INSERT INTO organization (id, name, "createdBy") 
            SELECT uuid_generate_v4(), 'Default Organization', 'system'
            WHERE NOT EXISTS (SELECT 1 FROM organization LIMIT 1);
        `)

        // 9. Создаем дефолтный workspace (если его нет)
        await queryRunner.query(`
            INSERT INTO workspace (id, name, "organizationId", "createdBy") 
            SELECT 
                uuid_generate_v4(), 
                'Default Workspace', 
                (SELECT id FROM organization LIMIT 1),
                'system'
            WHERE NOT EXISTS (
                SELECT 1 FROM workspace 
                WHERE "organizationId" = (SELECT id FROM organization LIMIT 1)
            );
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Откатывать не нужно, так как это базовая настройка
    }
}

