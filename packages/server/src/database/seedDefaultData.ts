import { DataSource } from 'typeorm'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'
import { User } from '../enterprise/database/entities/user.entity'
import { Organization } from '../enterprise/database/entities/organization.entity'
import { Workspace } from '../enterprise/database/entities/workspace.entity'
import logger from '../utils/logger'

export async function seedDefaultData(AppDataSource: DataSource): Promise<void> {
    try {
        const userRepo = AppDataSource.getRepository(User)
        const orgRepo = AppDataSource.getRepository(Organization)
        const workspaceRepo = AppDataSource.getRepository(Workspace)

        // Check if default user already exists
        const existingUser = await userRepo.findOne({ where: { email: 'admin@example.com' } })
        if (existingUser) {
            logger.info('✅ [seed]: Default data already exists, skipping seed')
            return
        }

        logger.info('🌱 [seed]: Seeding default data...')

        // Create default user
        const userId = uuidv4()
        const hashedPassword = await bcrypt.hash('Admin123!', 10)
        const user = new User()
        user.id = userId
        user.email = 'admin@example.com'
        user.name = 'Admin'
        user.credential = hashedPassword
        user.role = 'admin'
        user.status = 'active'
        user.createdDate = new Date().toISOString()
        user.updatedDate = new Date().toISOString()
        await userRepo.save(user)
        logger.info('✅ [seed]: Default user created')

        // Create default organization
        const orgId = uuidv4()
        const organization = new Organization()
        organization.id = orgId
        organization.name = 'Default Organization'
        organization.createdDate = new Date().toISOString()
        organization.updatedDate = new Date().toISOString()
        await orgRepo.save(organization)
        logger.info('✅ [seed]: Default organization created')

        // Create default workspace
        const workspaceId = uuidv4()
        const workspace = new Workspace()
        workspace.id = workspaceId
        workspace.name = 'Default Workspace'
        workspace.organizationId = orgId
        workspace.createdDate = new Date().toISOString()
        workspace.updatedDate = new Date().toISOString()
        await workspaceRepo.save(workspace)
        logger.info('✅ [seed]: Default workspace created')

        // Update user with active workspace
        user.activeWorkspaceId = workspaceId
        await userRepo.save(user)
        logger.info('✅ [seed]: User linked to workspace')

        logger.info('🎉 [seed]: Default data seeded successfully!')
    } catch (error) {
        logger.error(`❌ [seed]: Error seeding default data: ${error}`)
        throw error
    }
}

