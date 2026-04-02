import { baseEntity } from 'src/common/baseEntity';
import { UserRole } from 'src/common/enum';
import { Customer } from 'src/customers/entities/customer.entity';
import { Organization } from 'src/organization/entities/organization.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, Index } from 'typeorm';

@Entity('users')
@Index(['organizationId'])
export class User extends baseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({
    type: 'enum',
    enum: UserRole,
  })
  role: UserRole;

  @ManyToOne(() => Organization, (organization) => organization.users, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  organization: Organization;
  @Column({ type: 'uuid', nullable: true })
  organizationId: Organization['id'] | null;

  @OneToMany(() => Customer, (customer) => customer.user)
  customers: Customer[];
}
