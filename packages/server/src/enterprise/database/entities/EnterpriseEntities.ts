// Заглушка для minimal версии
import { Entity, Column, PrimaryGeneratedColumn, PrimaryColumn } from 'typeorm'

export const EnterpriseEntities = []

@Entity()
export class LoginActivity {
    @PrimaryGeneratedColumn('uuid')
    id?: string
}

@Entity()
export class WorkspaceShared {
    @PrimaryColumn()
    workspaceId?: string
    
    @PrimaryColumn()
    sharedItemId?: string
    
    @Column({ nullable: true })
    itemType?: string
}

@Entity()
export class WorkspaceUsers {
    @PrimaryGeneratedColumn('uuid')
    id?: string
}
