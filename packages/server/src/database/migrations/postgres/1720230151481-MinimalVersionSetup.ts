import { MigrationInterface, QueryRunner } from 'typeorm'

export class MinimalVersionSetup1720230151481 implements MigrationInterface {
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

        // 2. Вставляем базовые роли (если их нет)
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

        // 3. Добавляем недостающие поля в таблицу user (если будет создана позже)
        await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user') THEN
                    ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "createdBy" varchar;
                    ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "updatedBy" varchar;
                END IF;
            END $$;
        `)

        // 4. Добавляем поля в organization (если будет создана позже)
        await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization') THEN
                    ALTER TABLE organization ADD COLUMN IF NOT EXISTS "subscriptionId" varchar;
                    ALTER TABLE organization ADD COLUMN IF NOT EXISTS "customerId" varchar;
                    ALTER TABLE organization ADD COLUMN IF NOT EXISTS "createdBy" varchar;
                    ALTER TABLE organization ADD COLUMN IF NOT EXISTS "updatedBy" varchar;
                END IF;
            END $$;
        `)

        // 5. Добавляем поля в workspace (если будет создан позже)
        await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workspace') THEN
                    ALTER TABLE workspace ADD COLUMN IF NOT EXISTS "createdBy" varchar;
                    ALTER TABLE workspace ADD COLUMN IF NOT EXISTS "updatedBy" varchar;
                END IF;
            END $$;
        `)

        // 6. Создаем дефолтную организацию (если её нет и таблица существует)
        await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization') THEN
                    INSERT INTO organization (id, name, "createdBy") 
                    SELECT uuid_generate_v4(), 'Default Organization', 'system'
                    WHERE NOT EXISTS (SELECT 1 FROM organization LIMIT 1);
                END IF;
            END $$;
        `)

        // 7. Создаем дефолтный workspace (если его нет и таблица существует)
        await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workspace') THEN
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
                END IF;
            END $$;
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Откатывать не нужно, так как это базовая настройка
    }
}
