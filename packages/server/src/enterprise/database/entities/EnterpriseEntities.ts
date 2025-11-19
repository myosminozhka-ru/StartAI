// Заглушка для minimal версии
import { Entity, Column, PrimaryGeneratedColumn, PrimaryColumn } from 'typeorm'

export const EnterpriseEntities = []

@Entity()
export class LoginActivity {
    @PrimaryGeneratedColumn('uuid')
    id?: string
    
    @Column({ nullable: true })
    username?: string
    
    @Column({ type: 'integer', nullable: true })
    activityCode?: number
    
    @Column({ nullable: true })
    message?: string
    
    @Column({ nullable: true })
    loginMode?: string
    
    @Column({ type: 'timestamp', nullable: true })
    attemptedDateTime?: Date
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
