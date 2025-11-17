import { MigrationInterface, QueryRunner } from 'typeorm'

export class RemoveUserAuditColumns1762783600000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Удаляем колонки createdBy и updatedBy из таблицы user (упрощение для minimal версии)
        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'createdBy') THEN
                    ALTER TABLE "user" DROP COLUMN "createdBy";
                END IF;
                
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'updatedBy') THEN
                    ALTER TABLE "user" DROP COLUMN "updatedBy";
                END IF;
            END $$;
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Восстановление колонок (если потребуется откат)
        await queryRunner.query(`
            ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "createdBy" varchar;
            ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "updatedBy" varchar;
        `)
    }
}






