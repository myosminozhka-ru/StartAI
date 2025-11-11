// Заглушка для minimal версии
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm'

export type WorkspaceName = string

@Entity()
export class Workspace {
    @PrimaryGeneratedColumn('uuid')
    id?: string
    
    @Column({ nullable: true })
    organizationId?: string
    
    @Column({ nullable: true })
    name?: string
}


