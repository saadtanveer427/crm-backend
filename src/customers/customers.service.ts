import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, ILike, IsNull, Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { ActivityAction, UserRole } from 'src/common/enum';
import { ActivityLogsService } from 'src/activity-logs/activity-logs.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { ListCustomersQueryDto } from './dto/list-customers-query.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Customer } from './entities/customer.entity';
import { handleDbError } from 'src/common/utils/db-error.util';
import { JWTUser } from 'src/common/interface';

const MAX_ASSIGNED_CUSTOMERS = 5;

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customersRepository: Repository<Customer>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly activityLogsService: ActivityLogsService,
    private readonly dataSource: DataSource,
  ) {}

  async create(createCustomerDto: CreateCustomerDto, currentUser: JWTUser) {
    const isAdmin = currentUser.role === UserRole.ADMIN;

    if (isAdmin) {
      throw new BadRequestException('Admin cannot create customers');
    }

    const organizationId = currentUser.organizationId as string;
    const assignedUserId = currentUser.id;

    const saved = await this.dataSource.transaction(async (manager) => {
      if (assignedUserId) {
        // Lock the assigned user row to serialize concurrent assignment checks
        await manager.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [assignedUserId]);
        await this.assertUnderAssignmentLimit(assignedUserId, manager);
      }

      const customer = manager.create(Customer, {
        ...createCustomerDto,
        organizationId,
        userId: assignedUserId,
      });

      return manager.save(Customer, customer).catch((e) => handleDbError(e, 'customer'));
    });

    await this.activityLogsService.log(ActivityAction.CREATED, 'customer', saved.id, currentUser);

    return saved;
  }

  async findAll(query: ListCustomersQueryDto, currentUser: JWTUser) {
    const { search, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const orgFilter =
      currentUser.role === UserRole.ADMIN ? {} : { organizationId: currentUser.organizationId as string };
    const whereBase = { ...orgFilter, deletedAt: IsNull() };

    const whereConditions = search
      ? [
          { ...whereBase, name: ILike(`%${search}%`) },
          { ...whereBase, email: ILike(`%${search}%`) },
        ]
      : [whereBase];

    const [data, total] = await this.customersRepository.findAndCount({
      where: whereConditions,
      relations: { user: true, notes: true },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findDeleted(currentUser: User, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [data, total] = await this.customersRepository
      .createQueryBuilder('customer')
      .leftJoinAndSelect('customer.user', 'user')
      .leftJoinAndSelect('customer.notes', 'notes')
      .where(currentUser.role === UserRole.ADMIN ? '1=1' : 'customer.organizationId = :orgId', {
        orgId: currentUser.organizationId,
      })
      .andWhere('customer.deletedAt IS NOT NULL')
      .withDeleted()
      .orderBy('customer.deletedAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, currentUser: User) {
    const where =
      currentUser.role === UserRole.ADMIN ? { id } : { id, organizationId: currentUser.organizationId as string };

    const customer = await this.customersRepository.findOne({
      where,
      relations: { organization: true, user: true, notes: true },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with id "${id}" was not found.`);
    }

    return customer;
  }

  async update(id: string, updateCustomerDto: UpdateCustomerDto, currentUser: User) {
    const customer = await this.findOne(id, currentUser);

    const isReassigning = updateCustomerDto.userId !== undefined && updateCustomerDto.userId !== customer.userId;

    if (updateCustomerDto.userId) {
      await this.validateAssignedUser(updateCustomerDto.userId, customer.organizationId);
    }

    let saved: Customer;

    if (isReassigning && updateCustomerDto.userId) {
      const targetUserId = updateCustomerDto.userId;

      saved = await this.dataSource.transaction(async (manager) => {
        // Lock the target user row to serialize concurrent assignment checks
        await manager.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [targetUserId]);

        if (currentUser.role !== UserRole.ADMIN) {
          await this.assertUnderAssignmentLimit(targetUserId, manager);
        }

        Object.assign(customer, updateCustomerDto);
        return manager.save(Customer, customer).catch((e) => handleDbError(e, 'customer'));
      });

      await this.activityLogsService.log(ActivityAction.ASSIGNED, 'customer', id, currentUser);
    } else {
      Object.assign(customer, updateCustomerDto);
      saved = await this.customersRepository.save(customer).catch((e) => handleDbError(e, 'customer'));
      await this.activityLogsService.log(ActivityAction.UPDATED, 'customer', id, currentUser);
    }

    return saved;
  }

  async remove(id: string, currentUser: User) {
    const customer = await this.findOne(id, currentUser);
    await this.customersRepository.softRemove(customer);
    await this.activityLogsService.log(ActivityAction.DELETED, 'customer', id, currentUser);
    return { message: `Customer with id "${id}" deleted successfully.` };
  }

  async restore(id: string, currentUser: User) {
    const restoreWhere =
      currentUser.role === UserRole.ADMIN ? { id } : { id, organizationId: currentUser.organizationId as string };

    const customer = await this.customersRepository.findOne({
      where: restoreWhere,
      withDeleted: true,
    });

    if (!customer) {
      throw new NotFoundException(`Customer with id "${id}" was not found.`);
    }

    if (!customer.deletedAt) {
      throw new BadRequestException(`Customer with id "${id}" is not deleted.`);
    }

    await this.dataSource.transaction(async (manager) => {
      if (customer.userId) {
        // Lock the assigned user row to serialize concurrent restore/assignment checks.
        await manager.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [customer.userId]);
        await this.assertUnderAssignmentLimit(customer.userId, manager, 'restore');
      }
      await manager.restore(Customer, id);
    });

    await this.activityLogsService.log(ActivityAction.RESTORED, 'customer', id, currentUser);
    return { message: `Customer with id "${id}" restored successfully.` };
  }

  /**
   * Counts active (non-deleted) customers assigned to the user.
   * Must be called inside a transaction where the user row is already locked FOR UPDATE.
   */
  private async assertUnderAssignmentLimit(userId: string, manager: EntityManager, action = 'assign') {
    const activeCount = await manager.count(Customer, {
      where: { userId, deletedAt: IsNull() },
    });

    if (activeCount >= MAX_ASSIGNED_CUSTOMERS) {
      const actionMessage =
        action === 'restore'
          ? `Cannot restore this customer because the assigned user already has ${MAX_ASSIGNED_CUSTOMERS} active customers.`
          : `User already has ${MAX_ASSIGNED_CUSTOMERS} active customers assigned. Cannot assign more.`;

      throw new BadRequestException(actionMessage);
    }
  }

  private async validateAssignedUser(userId: string, organizationId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(`User with id "${userId}" was not found.`);
    }

    if (user.organizationId !== organizationId) {
      throw new BadRequestException('Assigned user must belong to the same organization.');
    }
  }
}
