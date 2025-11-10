// Заглушка для minimal версии
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm'

export type OrganizationName = string

@Entity()
export class Organization {
    @PrimaryGeneratedColumn('uuid')
    id?: string
    
    @Column({ nullable: true })
    subscriptionId?: string
    
    @Column({ nullable: true })
    name?: string
    
    @Column({ nullable: true })
    customerId?: string
    
    @Column({ nullable: true })
    createdBy?: string
    
    @Column({ nullable: true })
    updatedBy?: string
}

