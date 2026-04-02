import { ActivityAction } from 'src/common/enum';
import { Organization } from 'src/organization/entities/organization.entity';
import { User } from 'src/users/entities/user.entity';
import { Entity, PrimaryGeneratedColumn, Column, Index, ManyToOne, CreateDateColumn } from 'typeorm';

@Entity('activity_logs')
@Index(['organizationId'])
@Index(['entityId'])
@Index(['organizationId', 'entityId'])
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  entityType: string;

  @Column()
  entityId: string;

  @Column({
    type: 'enum',
    enum: ActivityAction,
  })
  action: ActivityAction;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  performedBy: User;
  @Column({ type: 'uuid', nullable: true })
  userId: User['id'] | null;

  @ManyToOne(() => Organization, { onDelete: 'SET NULL', nullable: true })
  organization: Organization;
  @Column({ type: 'uuid', nullable: true })
  organizationId: Organization['id'] | null;

  @CreateDateColumn({ name: 'timestamp', type: 'timestamptz' })
  timestamp!: Date;
}
