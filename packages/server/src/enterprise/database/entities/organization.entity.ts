// Заглушка для minimal версии
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm'

export enum OrganizationName {
    DEFAULT_ORGANIZATION = 'Default Organization'
}

@Entity()
export class Organization {
    @PrimaryGeneratedColumn('uuid')
    id?: string
    
    @Column({ nullable: true })
    name?: string
    
    @Column({ type: 'timestamp', nullable: true })
    createdDate?: Date
    
    @Column({ type: 'timestamp', nullable: true })
    updatedDate?: Date
    
    @Column({ nullable: true })
    createdBy?: string
    
    @Column({ nullable: true })
    updatedBy?: string
}

