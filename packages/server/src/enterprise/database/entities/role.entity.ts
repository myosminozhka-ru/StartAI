// Заглушка для minimal версии
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm'

export enum GeneralRole {
    VIEWER = 'VIEWER',
    EDITOR = 'EDITOR',
    ADMIN = 'ADMIN',
    OWNER = 'OWNER',
    MEMBER = 'MEMBER',
    PERSONAL_WORKSPACE = 'PERSONAL_WORKSPACE'
}

@Entity()
export class Role {
    @PrimaryGeneratedColumn('uuid')
    id?: string
    
    @Column({ nullable: true })
    name?: string
    
    @Column({ nullable: true })
    organizationId?: string
    
    @Column({ type: 'simple-json', nullable: true })
    permissions?: string[]
    
    @Column({ nullable: true })
    createdBy?: string
    
    @Column({ nullable: true })
    updatedBy?: string
}


