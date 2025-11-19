// Заглушка для minimal версии
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm'

export enum WorkspaceName {
    DEFAULT_WORKSPACE = 'Default Workspace',
    DEFAULT_PERSONAL_WORKSPACE = 'Default Personal Workspace'
}

@Entity()
export class Workspace {
    @PrimaryGeneratedColumn('uuid')
    id?: string
    
    @Column({ nullable: true })
    organizationId?: string
    
    @Column({ nullable: true })
    name?: string
    
    @Column({ type: 'timestamp', nullable: true })
    createdDate?: Date
    
    @Column({ type: 'timestamp', nullable: true })
    updatedDate?: Date
}


