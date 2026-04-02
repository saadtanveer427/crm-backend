import { baseEntity } from 'src/common/baseEntity';
import { Customer } from 'src/customers/entities/customer.entity';
import { Organization } from 'src/organization/entities/organization.entity';
import { User } from 'src/users/entities/user.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index } from 'typeorm';

@Entity('notes')
@Index(['customerId'])
export class Note extends baseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  content: string;

  @ManyToOne(() => Customer, (customer) => customer.notes)
  customer: Customer;
  @Column({ type: 'uuid' })
  customerId: Customer['id'];

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  createdBy: User;
  @Column({ type: 'uuid', nullable: true, name: 'created_by_id' })
  createdById: User['id'] | null;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  organization: Organization;
  @Column({ type: 'uuid' })
  organizationId: Organization['id'];
}
