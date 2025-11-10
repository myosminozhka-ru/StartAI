// Заглушка для minimal версии
import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm'
import { User } from './user.entity'
import { Role } from './role.entity'
import { Organization } from './organization.entity'

export enum OrganizationUserStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    INVITED = 'invited',
    SUSPENDED = 'suspended'
}

@Entity()
export class OrganizationUser {
    @PrimaryColumn({ type: 'uuid' })
    organizationId?: string
    
    @PrimaryColumn({ type: 'uuid' })
    userId?: string
    
    @Column({ nullable: true, type: 'uuid' })
    roleId?: string
    
    @Column({ nullable: true })
    status?: string
    
    @Column({ nullable: true })
    createdBy?: string
    
    @Column({ nullable: true })
    updatedBy?: string
    
    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'userId' })
    user?: User
    
    @ManyToOne(() => Role, { nullable: true, eager: true })
    @JoinColumn({ name: 'roleId' })
    role?: Role
    
    @ManyToOne(() => Organization, { nullable: true })
    @JoinColumn({ name: 'organizationId' })
    organization?: Organization
}


