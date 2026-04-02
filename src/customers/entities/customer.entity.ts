import { baseEntity } from 'src/common/baseEntity';
import { Note } from 'src/notes/entities/note.entity';
import { Organization } from 'src/organization/entities/organization.entity';
import { User } from 'src/users/entities/user.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index, OneToMany } from 'typeorm';

@Entity('customers')
@Index(['userId', 'deletedAt'])
@Index(['organizationId', 'email'], { unique: true })
@Index(['organizationId', 'createdAt'])
export class Customer extends baseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  email: string;

  @Column({ type: 'varchar', nullable: true })
  phone?: string;

  @ManyToOne(() => Organization, (organization) => organization.customers)
  organization: Organization;
  @Column({ type: 'uuid' })
  organizationId: Organization['id'];

  @ManyToOne(() => User, (user) => user.customers)
  user: User;
  @Column({ type: 'uuid', nullable: true })
  userId: User['id'] | null;

  @OneToMany(() => Note, (note) => note.customer)
  notes: Note[];
}
