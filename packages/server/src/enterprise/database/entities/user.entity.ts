// Заглушка для minimal версии
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm'

export enum UserStatus {
    UNVERIFIED = 'unverified',
    VERIFIED = 'verified',
    SUSPENDED = 'suspended',
    ACTIVE = 'active',
    INVITED = 'invited'
}

@Entity()
export class User {
    @PrimaryGeneratedColumn('uuid')
    id?: string
    
    @Column({ nullable: true })
    email?: string
    
    @Column({ nullable: true })
    credential?: string
    
    @Column({ nullable: true })
    name?: string
    
    @Column({ type: 'varchar', nullable: true })
    status?: UserStatus
    
    @Column({ nullable: true })
    tempToken?: string
    
    @Column({ type: 'timestamp', nullable: true })
    tokenExpiry?: Date
    
    @Column({ nullable: true })
    role?: string
    
    @Column({ nullable: true, type: 'uuid' })
    activeWorkspaceId?: string
    
    @Column({ type: 'timestamp', nullable: true })
    lastLogin?: Date
    
    @Column({ nullable: true })
    user_type?: string
    
    @ManyToOne(() => require('./workspace.entity').Workspace, { nullable: true })
    @JoinColumn({ name: 'activeWorkspaceId' })
    workspace?: any
}


