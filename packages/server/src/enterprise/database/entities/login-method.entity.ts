// Заглушка для minimal версии
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm'

export enum LoginMethodStatus {
    ENABLE = 'enable',
    DISABLE = 'disable',
    ACTIVE = 'active',
    INACTIVE = 'inactive'
}

@Entity()
export class LoginMethod {
    @PrimaryGeneratedColumn('uuid')
    id?: string
    
    @Column({ type: 'varchar', nullable: true })
    status?: LoginMethodStatus
    
    @Column({ type: 'text', nullable: true })
    config?: any
    
    @Column({ nullable: true })
    name?: string
    
    @Column({ nullable: true })
    organizationId?: string
    
    @Column({ nullable: true })
    createdBy?: string
    
    @Column({ nullable: true })
    updatedBy?: string
}
