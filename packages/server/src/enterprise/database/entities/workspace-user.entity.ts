// Заглушка для minimal версии
import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm'
import { Workspace } from './workspace.entity'
import { Role } from './role.entity'
import { User } from './user.entity'

export enum WorkspaceUserStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    INVITED = 'invited',
    SUSPENDED = 'suspended'
}

@Entity()
export class WorkspaceUser {
    @PrimaryColumn({ type: 'uuid' })
    workspaceId?: string
    
    @PrimaryColumn({ type: 'uuid' })
    userId?: string
    
    @Column({ nullable: true, type: 'uuid' })
    roleId?: string
    
    @Column({ nullable: true })
    status?: string
    
    @Column({ type: 'timestamp', nullable: true })
    lastLogin?: Date
    
    @Column({ nullable: true })
    updatedBy?: string
    
    @Column({ nullable: true })
    createdBy?: string
    
    @ManyToOne(() => Workspace, { nullable: true })
    @JoinColumn({ name: 'workspaceId' })
    workspace?: Workspace
    
    @ManyToOne(() => Role, { nullable: true, eager: true })
    @JoinColumn({ name: 'roleId' })
    role?: Role
    
    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'userId' })
    user?: User
}


