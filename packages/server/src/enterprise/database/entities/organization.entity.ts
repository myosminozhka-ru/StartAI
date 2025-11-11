// Заглушка для minimal версии
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm'

export type OrganizationName = string

@Entity()
export class Organization {
    @PrimaryGeneratedColumn('uuid')
    id?: string
    
    @Column({ nullable: true })
    name?: string
}

